use std::{fs, io::Read, path::PathBuf};

use serde_json::{json, Value};
use tiny_http::{Header, Response, Server};

const RESPONSE_STRING_404: &str = "404 not found";

const ICONIFY_API_URL: &str = "https://api.iconify.design";

/// Parses the path and the query from the GET header
fn parse_get_header(get_header: &str) -> (Option<&str>, Option<Vec<&str>>) {
    // Get the path
    let path = get_header.split('?').next();
    // Return None if there is no path
    if path.is_none() {
        return (None, None);
    }
    // Get the query
    let query = get_header.split('?').nth(1);
    // Return the path and None query if there is no query
    if query.is_none() {
        return (path, None);
    } else {
        // Parse the queries
        let query = query.unwrap().split('&').collect::<Vec<&str>>();
        // Return the path and the query
        return (path, Some(query));
    }
}

/// Gets the prefix and the icon names from the path and the query
fn get_prefix_and_icon(path: &str, queries: Vec<&str>) -> Option<(String, Vec<String>)> {
    // To get the prefix, remove the leading "/api/"
    let prefix = path.strip_prefix("/api/")?;
    // Remove the trailing .json from the prefix
    let prefix = prefix.strip_suffix(".json")?;

    // Among the queries, look for the one of shape "icons=icon1,icon2"
    let query = queries.iter().find(|&&x| x.starts_with("icons="))?;
    let icons = query.strip_prefix("icons=")?;

    // Replace the %2C with a comma
    let icons = icons.replace("%2C", ",");

    // Create a vector of String from the icons
    let icons = icons.split(',').map(|s| s.to_string()).collect::<Vec<_>>();

    // Return the prefix and the icons
    Some((prefix.to_string(), icons))
}

/// Generates a 404 response
fn generate_404() -> Response<std::io::Cursor<Vec<u8>>> {
    Response::from_string(RESPONSE_STRING_404).with_status_code(404)
}

/// Gets the icon data from the prefix file, or from the iconify api if possible.
/// Returns the icon data and
fn get_icon_data(icon: &str, prefix_name: &str, path: &PathBuf) -> String {
    let mut data = get_prefix_json(path, prefix_name).unwrap();
    let path = path.join(format!("{}.json", prefix_name));
    // Get the icon property of the json
    let icon_property = data.get(icon);
    // If you can't find the icon property
    match icon_property {
        None => {
            println!(
                "[ICON SERVER] Icon {} not found in {} file",
                icon, prefix_name
            );
            // Check if you are in developement mode
            if cfg!(debug_assertions) {
                let body = reqwest::blocking::get(format!(
                    "{}/{}.json?icons={}",
                    ICONIFY_API_URL, prefix_name, icon
                ));

                if body.is_ok() {
                    let mut icon_string = "".to_string();
                    let result = body.unwrap().read_to_string(&mut icon_string);
                    match result {
                        Ok(_) => {
                            // Parse the string and append it to the data
                            let icon_data: Value =
                                serde_json::from_str(icon_string.as_str()).unwrap();

                            // Check for the "not_found" property in the response
                            let not_found = icon_data.get("not_found");
                            if not_found.is_some() {
                                println!("[ICON SERVER] Icon {} not found in iconify api", icon);
                                return "".to_string();
                            }

                            data.as_object_mut()
                                .unwrap()
                                .insert(icon.to_string(), icon_data);

                            // Save the data to the prefix file
                            let write_result =
                                fs::write(path, serde_json::to_string_pretty(&data).unwrap());

                            return match write_result {
                                // If the file could not be created, return an empty string
                                Err(error) => {
                                    println!(
                                        "[ICON SERVER] Prefix file for {} could not be edited: {}",
                                        prefix_name, error
                                    );
                                    "".to_string()
                                }
                                Ok(()) => {
                                    println!(
                                        "[ICON SERVER] Icon {} added to prefix {}",
                                        icon, prefix_name
                                    );
                                    // Return the icon data
                                    icon_string
                                }
                            };
                        }
                        Err(err) => {
                            println!("[ICON SERVER] Unhandled Iconify API response: {}", err);
                        }
                    }
                }
            }

            "".to_string()
        }
        Some(value) => {
            // Return the icon data
            value.to_string()
        }
    }
}

/// Merges to api icons response objects
fn merge_icon_data(res: &mut Value, icon: &mut Value, icon_name: &str) -> Value {
    // If the res already contains the icon_name within its icons, return the res
    if res
        .get("icons")
        .unwrap()
        .as_object()
        .unwrap()
        .contains_key(icon_name)
    {
        return res.take();
    }

    // Get the res width and height
    let res_width = res.get("width").unwrap().as_u64().unwrap();
    let res_height = res.get("height").unwrap().as_u64().unwrap();
    // Get the icons property of the mutable json
    let res_data_icons = res.get_mut("icons").expect("Icons property not found");
    // Get the icons property of the json to merge
    let icon_aliases = icon.get("aliases").unwrap();

    // See if the icon has the icon_name property
    let icon_icons = icon.get("icons").unwrap();

    let icon_body: &Value;
    let mut aliased_icon_name = icon_name;

    if !icon_icons.as_object().unwrap().contains_key(icon_name) {
        // Check if it exists among the aliases
        let icon_aliases = icon_aliases.as_object().unwrap();
        let icon_aliases = icon_aliases.get(icon_name).unwrap();

        // Check the parent property of the icon
        let icon_aliases = icon_aliases.get("parent").unwrap();
        // Get the parent icon name
        let icon_alias = icon_aliases.as_str().unwrap();
        icon_body = icon
            .get("icons")
            .unwrap()
            .get(icon_alias)
            .unwrap()
            .get("body")
            .unwrap();
        aliased_icon_name = icon_alias;
    } else {
        icon_body = icon
            .get("icons")
            .unwrap()
            .get(icon_name)
            .unwrap()
            .get("body")
            .unwrap();
    }

    // Get the icon width and height
    let icon_width = icon.get("width").unwrap().as_u64().unwrap();
    let icon_height = icon.get("height").unwrap().as_u64().unwrap();

    // Create the icon object
    let mut sub_icon = json!({
        "body": icon_body,
    });
    // Add the width if it is different from the res width
    if res_width != icon_width {
        sub_icon
            .as_object_mut()
            .unwrap()
            .insert("width".to_string(), json!(icon_width));
    }
    // Add the height if it is different from the res height
    if res_height != icon_height {
        sub_icon
            .as_object_mut()
            .unwrap()
            .insert("height".to_string(), json!(icon_height));
    }

    // Add the icon to the res icons
    res_data_icons
        .as_object_mut()
        .unwrap()
        .insert(aliased_icon_name.to_string(), sub_icon);

    // Add the aliases to the res aliases
    let res_aliases = res.get_mut("aliases").unwrap();
    for (key, value) in icon_aliases.as_object().unwrap().iter() {
        res_aliases
            .as_object_mut()
            .unwrap()
            .insert(key.to_string(), value.clone());
    }

    // Return the icon data as string
    res.take()
}

/// Gets the icon data for multi-icons requests
/// Goes through all the trouble of composing the request
fn get_icons_data(icons: Vec<String>, prefix_name: &str, path: &PathBuf) -> String {
    // The icons are more than one
    assert!(icons.len() > 1);

    // Get the first icon's data
    let first_icons = get_icon_data(&icons[0], prefix_name, path);
    // Based on it, parse the json for the response
    let mut res_data: Value = serde_json::from_str(first_icons.as_str()).unwrap();

    // Add the other icons to the json
    for (i, icon) in icons.iter().enumerate() {
        // Skip the first icon
        if i == 0 {
            continue;
        }
        // Get the icon data
        let icon_data = get_icon_data(icon, prefix_name, path);
        // If the icon data is empty, skip it
        if icon_data == "" {
            continue;
        }
        // Parse the icon_data as json
        let mut icon_data: Value = serde_json::from_str(icon_data.as_str()).unwrap();
        // Add the icon data to the response data
        res_data = merge_icon_data(&mut res_data, &mut icon_data, icon);
    }

    res_data.to_string()
}

fn get_prefix_json(path: &PathBuf, prefix: &str) -> Result<Value, String> {
    // Create the path by concatenating the path with other stuff
    let path = path.join(format!("{}.json", prefix));
    // See if the prefix file exists
    if !path.exists() {
        // Create it
        fs::write(&path, "{}").map_err(|e| e.to_string())?;
    }
    // Get the prefix file from the ICONS_URL folder
    let prefix_file = fs::read_to_string(&path).unwrap();
    // Parse the json
    serde_json::from_str(prefix_file.as_str()).map_err(|e| e.to_string())
}

/// Returns the response body for the requested icons
fn get_icons(prefix: &str, icons: Vec<String>, path: &PathBuf) -> String {
    // If the request was a single icon, return the icon data
    if icons.len() == 1 {
        get_icon_data(&icons[0], prefix, &path)
    } else {
        get_icons_data(icons, prefix, &path)
    }
}

/// Spawns and runs the iconify server
pub fn spawn_iconify_server_thread(icons_path: PathBuf) {
    std::thread::spawn(move || {
        let server = Server::http("127.0.0.1:3000").expect("Failed to start http server");

        for request in server.incoming_requests() {
            // Parse the request
            let (path, query) = parse_get_header(request.url());

            // Exit if either path or query are none
            if path.is_none() || query.is_none() {
                println!("[ICON SERVER] Path or query is none");
                // Create a 404 response and continue
                let _ = request.respond(generate_404());
                continue;
            }

            let path = path.unwrap();
            let query = query.unwrap();

            let mut response: Response<std::io::Cursor<Vec<u8>>>;

            // Get the prefix and the path
            match get_prefix_and_icon(path, query) {
                Some((prefix, icons)) => {
                    // Get the icons to put in the response
                    let icons = get_icons(&prefix, icons, &icons_path);
                    // Create the response
                    response = Response::from_string(icons).with_status_code(200);
                }
                None => {
                    println!("[ICON SERVER] Prefix or icon is none");
                    // Create a 404 response and continue
                    let _ = request.respond(generate_404());
                    continue;
                }
            }

            // let mut response = tiny_http::Response::from_string("{\"prefix\": \"mdi\",\"lastModified\": 1689058119,\"aliases\": {},\"width\": 24,\"height\": 24,\"icons\": { \"home\": {  \"body\": \"<path fill=\\\"currentColor\\\" d=\\\"M10 20v-6h4v6h5v-8h3L12 3L2 12h3v8h5Z\\\"/>\" }}}");
            response.add_header(
                Header::from_bytes(
                    &b"Content-Type"[..],
                    &b"application/json; charset=utf-8"[..],
                )
                .unwrap(),
            );
            response.add_header(
                Header::from_bytes(
                    &b"Access-Control-Allow-Origin"[..],
                    if cfg!(debug_assertions) {
                        &b"http://localhost:1420"[..]
                    } else {
                        &b"*"[..]
                    },
                )
                .unwrap(),
            );

            let _ = request.respond(response);
        }
    });
}
