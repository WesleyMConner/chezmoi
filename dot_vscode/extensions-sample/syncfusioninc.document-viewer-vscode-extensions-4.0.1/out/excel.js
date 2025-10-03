var blob;
var data;
var uint;
(function () 
{
    var vscode = acquireVsCodeApi();

    window.onload = () => 
    { 
        document.body.style.height = document.documentElement.clientHeight + 'px';
        try
        {
            spreadsheet = new ej.spreadsheet.Spreadsheet(
            {                
                allowOpen: true,
                allowInsert:false,
                allowDelete:false,
                allowSave: true,
                allowFiltering: true,
                allowSorting: true,
                showRibbon: false,
                enableNotes:false,
                enableClipboard:true,
                allowHyperlink:false,
                showFormulaBar: false,
                //openUrl: 'https://services.syncfusion.com/js/production/api/spreadsheet/open',
    
                created: () => 
                {
                    spreadsheet.hideFileMenuItems(["File"], true); 
                    spreadsheet.showSpinner();
                    vscode.postMessage({
                        type: 'SpreadsheetComponentCreated'
                    });
                },
                
                dialogBeforeOpen: (args)=>
                {
                    args.cancel=true;
                },

                cellEdited: () => 
                {
                    vscode.postMessage
                    ({
                        changed: true,
                        reason: "Cell Edited"
                    });
                },
                 
                beforeCellSave:function (args) 
                {
                    //spreadsheet.showSpinner();
                    console.log(args);
                },

                beforeSave: function (args) 
                {
                    spreadsheet.showSpinner();
                    args.isFullPost = false;
                    args.needBlobData = true;
                },

                saveComplete: function(args) 
                {
                    //spreadsheet.showSpinner();
                    var reader = new FileReader();
                    reader.readAsArrayBuffer(args.blobData); 
                    reader.onloadend = function() {
                        var arrayBuffer = reader.result;
                        var binary = '';
                        if (arrayBuffer) {
                            var bytes = new Uint8Array(arrayBuffer);
                            var length = bytes.byteLength;
                            for (var i = 0; i < length; i++) {
                                binary += String.fromCharCode(bytes[i]);
                            }
                        }
                        
                        vscode.postMessage({
                            type: "data",
                            file: binary
                        });
                    }
                },

                openComplete: function() 
                {
                    if (window.filteringMode) {
                        spreadsheet.clearFilter();
                        const filterBtn = spreadsheet.element.querySelector('.e-sheet-content .e-filter-btn');
                        if(!filterBtn)
                        {
                            spreadsheet.applyFilter();
                        }

                    } else {
                        spreadsheet.clearFilter();
                            // Checking whether the filter icons is in the DOM.
                        const filterBtn = spreadsheet.element.querySelector('.e-sheet-content .e-filter-btn');
                        if (filterBtn) {
                            // If filter icons are added, this method will remove the added filter icons.
                            spreadsheet.applyFilter();
                        }
                        // Disable the filter support
                        // Applying the changes into the spreadsheet immediately.
                        spreadsheet.dataBind();
                    }
                },
                contextMenuBeforeOpen: function(){
                    spreadsheet.removeContextMenuItems(['', '', ''], false)
                },
                openFailure: (args) => {
                    vscode.postMessage({
                        type: 'FileOpeningError',
                        stack: args.stack,
                        error: args.message
                    });
                }          
            });
            spreadsheet.appendTo('#spreadsheet');

        } catch (error) 
        {
            vscode.postMessage({
                type: 'spreadsheetInitializationError',
                error: error
            });
        }

        window.addEventListener('resize', onResize);
        function onResize() 
        {
            document.body.style.height = document.documentElement.clientHeight + 'px';
            if(spreadsheet && spreadsheet.resize)
            {
                 spreadsheet.resize();

            }
        }

    }
    window.addEventListener('message', event => {
        const message = event.data;
        if (message.file) {
            const decoded = atob(message.file);
            const cleaned = decoded.trim();
            const jsonData = JSON.parse(cleaned);
            spreadsheet.openFromJson({ file: jsonData });
            spreadsheet.hideSpinner();
            spreadsheet.allowEditing = message.editingMode;
            window.filteringMode = message.filteringMode;
            window.showRibbon = message.showRibbon;

            if (message.filteringMode) {
                spreadsheet.clearFilter();
                setTimeout(() => {
                    const filterBtn = spreadsheet.element.querySelector('.e-sheet-content .e-filter-btn');
                    if (!filterBtn) {
                        spreadsheet.applyFilter();
                    }
                }, 600);
            } else {
                setTimeout(() => {
                    spreadsheet.clearFilter();
                    const filterBtn = spreadsheet.element.querySelector('.e-sheet-content .e-filter-btn');
                    if (filterBtn) {
                        spreadsheet.applyFilter();
                    }
                    spreadsheet.dataBind();
                }, 600);
            }
            
        } else if (message.type == "saveas") {
            try {
                spreadsheet.showSpinner();
                spreadsheet.saveAsJson().then((json) => {
                    //spreadsheet.showSpinner();
                    function formDataToJson(formData) {
                        const object = {};
                        formData.forEach((value, key) => {
                            object[key] = value;
                        });
                        return object;
                    }

                    const formData = new FormData();
                    formData.append('FileName', "Sample");
                    formData.append('saveType', 'Xlsx');
                    formData.append('JSONData', JSON.stringify(json.jsonObject.Workbook));
                    formData.append('PdfLayoutSettings', JSON.stringify({ FitSheetOnOnePage: false }));

                    const jsonObject = formDataToJson(formData);

                    vscode.postMessage({
                        type: 'data',
                        file: JSON.stringify(jsonObject, null, 2)
                    });
                    spreadsheet.showSpinner();
                });
               
            } catch (error) {
                vscode.postMessage({
                    type: "spreadsheetSaveError",
                    error: error.message
                });
            }
        } else if (message.type == "saved") {
            spreadsheet.endEdit();
        } else if (message.type == "editingMode") {
            spreadsheet.allowEditing = message.editingMode;
        } else if (message.type == "filteringMode") {
            if (message.filteringMode) {
                spreadsheet.clearFilter();
                setTimeout(() => {
                    const filterBtn = spreadsheet.element.querySelector('.e-sheet-content .e-filter-btn');
                    if (!filterBtn) {
                        spreadsheet.applyFilter();
                    }
                }, 600);
            } else {
                setTimeout(() => {
                    spreadsheet.clearFilter();
                    const filterBtn = spreadsheet.element.querySelector('.e-sheet-content .e-filter-btn');
                    if (filterBtn) {
                        spreadsheet.applyFilter();
                    }
                    spreadsheet.dataBind();
                }, 600);
            }
        } else if (message.type == "enableSpinner") {
            spreadsheet.showSpinner();
        } else if (message.type == "disableSpinner") {
            spreadsheet.hideSpinner();
        }
    });
}()); 


