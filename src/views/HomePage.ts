import { ViewContext } from "src/systems/contexts";
import HomePage from "src/views/HomePage.svelte";

export class HomePageContext extends ViewContext {
    public static icon = "material-symbols:home";
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