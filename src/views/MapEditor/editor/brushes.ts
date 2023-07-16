export class Brush {
    public name = "Untitled Brush #";

    constructor(name?: string) {
        this.name = name ?? this.name;
    }
}