import HomePage from "../views/HomePage.svelte";
import { ViewContext } from "../systems/views";

export class HomePageContext extends ViewContext {
    public name = "Home Page";
    public selected = true;

    public constructor() {
        super(HomePage, {});
    }

    public save() { return true; }
}