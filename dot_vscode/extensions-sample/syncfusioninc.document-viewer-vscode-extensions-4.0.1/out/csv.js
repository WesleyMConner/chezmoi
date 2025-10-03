var data;
var PostMessage;
  function load()
  {
    window.onload = () => 
    { 
        var vscode = acquireVsCodeApi();
        document.body.style.height = document.documentElement.clientHeight + 'px';
        PostMessage = vscode.postMessage;
        try
        {
            spreadsheet = new ej.spreadsheet.Spreadsheet(
            {
                showRibbon: false,
                showFormulaBar: false,
                allowOpen: true,
                allowInsert:false,
                allowFiltering: true,
                allowSorting: true,
                allowDelete:false,
                enableNotes:false,
                enableClipboard:true,
                allowHyperlink:false,
                allowSave: true,
                //openUrl: 'https://services.syncfusion.com/js/production/api/spreadsheet/open',
                created: () => 
                {
                    spreadsheet.applyFilter();
                    spreadsheet.hideFileMenuItems(["File"], true); 
                    spreadsheet.showSpinner();
                    vscode.postMessage({
                        type: 'SpreadsheetComponentCreated'
                    });
                },
                contextMenuBeforeOpen: function(){
                    spreadsheet.removeContextMenuItems(['', '', ''], false)
                },
                cellEdited: (args) => {                 
                        var value=args.value;
                        
                        var indexes = ej.spreadsheet.getRangeIndexes(args.address);
                        vscode.postMessage(
                            {
                                row: indexes[0],
                                column:indexes[1],
                                value:value,
                                changed:true
                            });
    
                },
                cellSave: (args) => {              
                var value=args.value;
                
                var indexes = ej.spreadsheet.getRangeIndexes(args.address);
                vscode.postMessage(
                    {
                        type:"cellsave",
                        row: indexes[0],
                        column:indexes[1],
                        value:value,
                    });
    
                },
                dialogBeforeOpen: (args)=>
                {
                    args.cancel=true;        
                },
                beforeSave: function (args) 
                {
                    
                    args.saveType="Csv";               
                    args.isFullPost = false;
                    args.needBlobData = true;
                    vscode.postMessage({ 
                        type:"beforeSave",
                        file: base64data });
                },
                saveComplete: function(args) 
                {
                    var reader = new FileReader();
                
                    reader.readAsDataURL(args.blobData); 
                    reader.onloadend = function() 
                    {
                        var base64data = reader.result;
                        vscode.postMessage({ 
                            type:"save",
                            file: base64data });
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
                        // document.querySelectorAll('.e-filter-btn.e-control.e-btn.e-lib.e-filter-iconbtn.e-icon-btn').forEach(element => {
                        //     element.style.display = 'block';
                        // });
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
            spreadsheet.resize();
        }
    }

    //handle events from the webview

    window.addEventListener('message', event => 
    {
        const message = event.data; 
        if(message.file)
        {
            spreadsheet.openFromJson({ file: message.file });
            spreadsheet.hideSpinner();
            spreadsheet.allowEditing=message.editingMode;

            window.filteringMode = message.filteringMode;
            window.showRibbon = message.showRibbon;

            if (message.filteringMode) {
                spreadsheet.clearFilter();
                const filterBtn = spreadsheet.element.querySelector('.e-sheet-content .e-filter-btn');
                if(!filterBtn)
                {
                    spreadsheet.applyFilter();
                }
            } else {
                spreadsheet.clearFilter();
       
                const filterBtn = spreadsheet.element.querySelector('.e-sheet-content .e-filter-btn');
                if (filterBtn) {
                    
                    spreadsheet.applyFilter();
                }
                spreadsheet.dataBind();
            }  

        }  
        else if(message.type=="SaveTriggerred")
        {
          spreadsheet.endEdit();
        }
        else if(message.type=="editingMode")
        {
            spreadsheet.allowEditing=message.editingMode; 
        }
        else if(message.type=="filteringMode")
        {
            if(message.filteringMode)
            {
                spreadsheet.clearFilter();
                setTimeout((() => {
                const filterBtn = spreadsheet.element.querySelector('.e-sheet-content .e-filter-btn');
                if(!filterBtn)
                {
                    spreadsheet.applyFilter();
                }
                }),600);
            }
            else
            {
                
                setTimeout((() => {
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
                }),600);

            }
        }
        
    });   
} 