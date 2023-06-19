export abstract class Dialog {
    public static get isOpen(): boolean {
        return !!document.querySelector(".dialog");
    };

    abstract open(): Promise<any>;
}

// export class ErrorDialog extends Dialog {

// }

export class ConfirmDialog extends Dialog {
    constructor(private message: string) {
        super();
    }

    public open(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            let dialog = document.createElement("dialog");
            dialog.classList.add("dialog");
            dialog.innerHTML = `
                <div class="dialog-content">
                    <div class="dialog-message">
                        ${this.message}
                    </div>
                    <div class="dialog-buttons">
                        <button class="dialog-button dialog-confirm">Confirm</button>
                        <button class="dialog-button dialog-cancel">Cancel</button>
                    </div>
                </div>
            `;

            let confirmButton = dialog.querySelector(".dialog-confirm") as HTMLButtonElement;
            let cancelButton = dialog.querySelector(".dialog-cancel") as HTMLButtonElement;

            confirmButton.addEventListener("click", () => {
                resolve(true);
                dialog.remove();
            });

            cancelButton.addEventListener("click", () => {
                resolve(false);
                dialog.remove();
            });

            document.body.appendChild(dialog);
            dialog.showModal();
        });
    }
}

export class KeepChangesDialog extends ConfirmDialog {
    constructor() {
        super("Do you want to save your changes?");
    }
}