import HomePage from "../views/HomePage.svelte";
import { ViewContext } from "../systems/views";

export class HomePageContext extends ViewContext {
    public name = "Home Page";
    public selected = true;
    public actions = {
        "home_page/open_last_project": () => {
            console.log("Opening last project");
        }
    }

    public constructor(props: {} = {}, position: number = null) {
        super(HomePage, props);
    }

    public save() { return true; }
}