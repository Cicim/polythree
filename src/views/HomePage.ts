import HomePage from "src/views/HomePage.svelte";
import { ViewContext } from "src/systems/contexts";

export class HomePageContext extends ViewContext {
    public name = "Home Page";
    public singularTab = true;
    public needsRom = false;
    public actions = {
        "home_page/open_last_project": () => {
            console.log("Opening last project");
        }
    }

    public constructor(props: {} = {}) {
        super(HomePage, props);
    }
}