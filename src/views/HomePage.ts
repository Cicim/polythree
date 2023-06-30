import HomePage from "src/views/HomePage.svelte";
import { ViewContext, openViews } from "src/systems/views";
import { get } from "svelte/store";

export class HomePageContext extends ViewContext {
    public name = "Home Page";
    public actions = {
        "home_page/open_last_project": () => {
            console.log("Opening last project");
        }
    }

    public constructor(props: {} = {}) {
        super(HomePage, props);
    }

    public create(position?: number): this {
        let view = get(openViews).find((view) => view instanceof HomePageContext);
        if (view) {
            view.select();
            return view as this;
        }
        return super.create(position);
    }
}