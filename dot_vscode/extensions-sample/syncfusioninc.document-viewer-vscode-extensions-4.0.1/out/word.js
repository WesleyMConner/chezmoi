// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    var vscode = acquireVsCodeApi();
    window.onload = () => {
        try
        {
            documenteditorContainer = new ej.documenteditor.DocumentEditorContainer({
                enableToolbar: false,
                height: document.documentElement.clientHeight + 'px',
                enableOptionsPane:false,
                enableContextMenu:false,
                showPropertiesPane:false
            });
            ej.documenteditor.DocumentEditorContainer.Inject(ej.documenteditor.Toolbar);
            
            ej.popups.createSpinner({
                target: document.getElementById('container')
            });

            onCreated = function (){
                ej.popups.showSpinner(document.getElementById('container'));
                setInterval(() => {
                    updateDocumentEditorSize();
                }, 100);
                vscode.postMessage({
                    type: 'DocumentViewerComponentCreated'
                }); 
            };
            function handleActionComplete(args) {
                vscode.postMessage({
                    type: 'savedEvent',
                    error: error
                });
            }
            documenteditorContainer.appendTo('#documentViewer');
            documenteditorContainer.documentEditor.isReadOnly = true;
            documenteditorContainer.addEventListener("created", onCreated());
            documenteditorContainer.addEventListener('actionComplete', handleActionComplete);
            documenteditorContainer.contentChange = function()
            {
                vscode.postMessage
                    ({
                        changed: true,
                        reason: "Cell Edited"
                    });
            }
            function updateDocumentEditorSize() {
                //Resizes the document editor component to fit full browser window.
                var windowWidth = window.innerWidth;
                var windowHeight = window.innerHeight;
                documenteditorContainer.resize(windowWidth, windowHeight);
            }
            //Preventing the keyboard shortcut for document Editor
            documenteditorContainer.documentEditor.keyDown = function (args) {
                let keyCode = args.event.which || args.event.keyCode;
                let isCtrlKey = (args.event.ctrlKey || args.event.metaKey) ? true : ((keyCode === 17) ? true : false);
                let isAltKey = args.event.altKey ? args.event.altKey : ((keyCode === 18) ? true : false);
                if (isCtrlKey && !isAltKey && keyCode === 83) {
                    vscode.postMessage({
                        type: 'saveFile'
                    });
                    args.isHandled = true;
                }
            }
        }catch(error)
        {
            vscode.postMessage({
                type: 'error',
                error: error.message
            });
        }
        window.addEventListener('resize', updateDocumentEditorSize);
        window.addEventListener('message', event => {
            try
            {
                const message = event.data;
                if (message.file)
                {
                    documenteditorContainer.documentEditor.open(message.file);
                    ej.popups.hideSpinner(document.getElementById('container'));
                    documenteditorContainer.documentEditor.isReadOnly = message.editingMode;
                }
                else if (message.type == 'saveas')
                {

                    documenteditorContainer.documentEditor.saveAsBlob('Docx').then((exportedDocument) => {
                        const reader = new FileReader();
                    
                        reader.onloadend = function(event) {
                            if (event.target.readyState === FileReader.DONE) {
                                const arrayBuffer = event.target.result;
                                const uint8Array = new Uint8Array(arrayBuffer);
                                
                                // Convert Uint8Array to a binary string
                                let binary = '';
                                for (let i = 0; i < uint8Array.length; i++) {
                                    binary += String.fromCharCode(uint8Array[i]);
                                }
                    
                                // Send the binary string back to the extension
                                vscode.postMessage({
                                    type: 'data',
                                    file: binary
                                });
                            }
                        };
                    
                        // Read the Blob as an ArrayBuffer
                        reader.readAsArrayBuffer(exportedDocument);
                    });
                }
                else if(message.type=="editingMode")
                {
                    documenteditorContainer.documentEditor.isReadOnly = message.editingMode;
                }
            }catch(error)
            {
                vscode.postMessage({
                    type: 'error',
                    error: error.message
                });
            }

        });
    }
    
}());
