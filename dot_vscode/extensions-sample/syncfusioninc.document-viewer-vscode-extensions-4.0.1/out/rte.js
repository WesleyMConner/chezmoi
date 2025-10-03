var vscodePathUri = 'https://file%2B.vscode-resource.vscode-cdn.net';
var exePath = '';
var isknownEdit = true;
(function () {
    const vscode = acquireVsCodeApi();

    window.onload = () => {
        try {

            function getFileNameFromPath(path) {
                // Split the path by both forward slash and backslash
                const parts = path.split(/[\\/]/);
                // Return the last part (file name)
                return parts[parts.length - 1];
            }

            // Initialize Syncfusion RichTextEditor
            const richtexteditor = new ej.richtexteditor.RichTextEditor({
                height: document.documentElement.clientHeight + 'px',
                isReadOnly: true,
                saveInterval:100,
                toolbarSettings: {
                    items: ['Bold','Italic','|','Formats','Blockquote','UnorderedList','|','CreateLink','InlineCode','Image','|','Undo', 'Redo',
                        {
                            tooltipText: 'Open VS Code Text Editor',
                            // undo: true,
                            click: function () {
                                vscode.postMessage({
                                    type: 'openTextEditor'
                                });
                            },
                            template:
                            '<button class="e-tbar-btn e-btn" tabindex="-1" id="custom_tbar"  style="width:100%"><svg height="20" viewBox="-11.9 -2 1003.9 995.6" width="20" xmlns="http://www.w3.org/2000/svg"><path d="m12.1 353.9s-24-17.3 4.8-40.4l67.1-60s19.2-20.2 39.5-2.6l619.2 468.8v224.8s-.3 35.3-45.6 31.4z" fill="#2489ca"></path><path d="m171.7 498.8-159.6 145.1s-16.4 12.2 0 34l74.1 67.4s17.6 18.9 43.6-2.6l169.2-128.3z" fill="#1070b3"></path><path d="m451.9 500 292.7-223.5-1.9-223.6s-12.5-48.8-54.2-23.4l-389.5 354.5z" fill="#0877b9"></path><path d="m697.1 976.2c17 17.4 37.6 11.7 37.6 11.7l228.1-112.4c29.2-19.9 25.1-44.6 25.1-44.6v-671.2c0-29.5-30.2-39.7-30.2-39.7l-197.7-95.3c-43.2-26.7-71.5 4.8-71.5 4.8s36.4-26.2 54.2 23.4v887.5c0 6.1-1.3 12.1-3.9 17.5-5.2 10.5-16.5 20.3-43.6 16.2z" fill="#3c99d4"></path></svg></div></button>',
                        }
                    ]
                },
                quickToolbarSettings: {
                    image: []
                },
                actionBegin:function(args) {
                    console.log(args);
                    if (args.requestType === 'Image') {
                        
                        var src =args.itemCollection.url;
                        if (src.startsWith('http://') || src.startsWith('https://')) {
                            //return match; 
                        }else{
                            try {

                                if(isFullPath(src))
                                {
                                    var currentPath = args.itemCollection.url;
                                    args.itemCollection.url = convertFilePathToUrl(getFileNameFromPath(args.itemCollection.url));
                                    console.log(args.itemCollection.url);
                                    vscode.postMessage({
                                        type: 'insertImage',
                                        sourcePath: currentPath
                                    });
                                }
                                else{
                                   var inputPath = args.itemCollection.url;
                                    var currentPath = resolveFilePath(exePath.path,getFileNameFromPath(args.itemCollection.url));
                                    args.itemCollection.url = convertFilePathToUrl(currentPath);
                                    console.log(args.itemCollection.url);
                                    vscode.postMessage({
                                        type: 'insertImage',
                                        sourcePath: inputPath
                                    });
                                }
                               
                            } catch (error) {
                                console.error(`Error resolving image path ${src}: ${error}`);
                                return match; 
                            }
                        }
                    }
                    console.log(args);
                },
                change: function(args) {
                    if(isknownEdit)
                    {
                        isknownEdit = false;
                    }
                    else{
                        vscode.postMessage
                        ({
                            changed: true,
                            reason: "Content Edited"
                        });
                    }
                },
                created: function(args) {

                }
            });
            richtexteditor.appendTo('#rteViewer');

            const editPanel = richtexteditor.contentModule.getEditPanel();
            if (editPanel) {
                editPanel.contentEditable = 'false';
            }
            
            function isFullPath(path) {
                if (!path || typeof path !== 'string') {
                    return false;
                }

                const normalizedPath = path.replace(/\\/g, '/').trim();

                const windowsFullPath = /^[a-zA-Z]:\/|^\\\\[\w\W]/.test(normalizedPath);

                const unixFullPath = normalizedPath.startsWith('/');

                const homePath = normalizedPath.startsWith('~/');

                return windowsFullPath || unixFullPath || homePath;
            }
            
            function convertFilePathToUrl(localPath) {
                // Replace backslashes with forward slashes
                let urlPath = localPath.replace(/\\/g, '/');
                
                // Convert drive letter to lowercase and remove colon
                urlPath = urlPath.replace(/^([A-Z]):/, (match, drive) => drive.toLowerCase());
                
                // Add the URL prefix
                const urlPrefix = 'https://file+.vscode-resource.vscode-cdn.net/';
                return urlPrefix + urlPath;
            }
            
            function resolveFilePath(basePath, relativePath) {
                // Normalize paths by replacing backslashes with forward slashes for consistency
                basePath = basePath.replace(/\\/g, '/');
                relativePath = relativePath.replace(/\\/g, '/');

                // Remove leading './' from relativePath if present
                relativePath = relativePath.replace(/^\.\//, '');

                // Split paths into segments
                let baseSegments = basePath.split('/').filter(segment => segment);
                let relativeSegments = relativePath.split('/').filter(segment => segment);

                // Handle '../' in relativePath
                let upCount = 0;
                for (let segment of relativeSegments) {
                    if (segment === '..') {
                        upCount++;
                        relativeSegments.shift(); // Remove the '..' segment
                    } else {
                        break;
                    }
                }

                // Remove the last 'upCount' segments from basePath
                baseSegments = baseSegments.slice(0, baseSegments.length - upCount);

                // Combine the remaining base segments with the relative segments
                let combinedSegments = [...baseSegments, ...relativeSegments];

                // Reconstruct the path
                let resolvedPath = combinedSegments.join('/');

                // Ensure the drive letter (e.g., 'D:') is preserved if present
                if (basePath.match(/^[A-Za-z]:\//)) {
                    resolvedPath = basePath.slice(0, 2) + '/' + resolvedPath;
                }

                // Convert forward slashes to backslashes for Windows if needed
                return resolvedPath.replace(/\//g, '\\');
            }
             function getImages() {
                const content = richtexteditor.getContent();
                const parser = new DOMParser();
                const doc = parser.parseFromString(content, 'text/html');
                return Array.from(doc.querySelectorAll('img')).map(img => ({
                    alt: img.alt || '',
                    src: img.src,
                    originalPath: img.getAttribute('data-original-path') || img.src
                }));
            }

            // Notify the extension that the editor is ready
            vscode.postMessage({
                type: 'RichTextEditorViewerComponentCreated'
            });

            window.addEventListener('resize', () => {
                richtexteditor.height = document.documentElement.clientHeight + 'px';
                richtexteditor.dataBind(); // Refreshes the component with the new height
            });

            function extractFilePath(url) {
                const pattern = /https:\/\/file\+.vscode-resource.vscode-cdn.net\/(.+)/;

                const match = url.match(pattern);
                
                if (match && match[1]) {
                    return match[1]; 
                } else {
                    return url; 
                }
            }
            
            window.addEventListener('message', event => {
                try {
                    const message = event.data;

                    if (message.type === 'file') {
                        
                        richtexteditor.isReadOnly = !message.editingMode;
                        richtexteditor.toolbarSettings.enable = !message.editingMode;
                        const editPanel = richtexteditor.contentModule.getEditPanel();
                        if (editPanel) {
                            editPanel.contentEditable = message.editingMode ? 'false' : 'true';
                        }
                        isknownEdit = true;
                        richtexteditor.contentModule.getEditPanel().innerHTML = message.file;
                        imageMap = {};
                        getImages().forEach(img => {
                            imageMap[img.src] = img.originalPath;
                        });
                        exePath = message.exePath;
                        document.getElementById('rteViewer_toolbar_Image').addEventListener('click', function() {
                            setTimeout(function() {
                                const dropArea = document.querySelector('.e-img-uploadwrap.e-droparea');
                                if (dropArea) {
                                    dropArea.style.display = 'none';
                                }

                                const imgInput = document.querySelector('.e-input.e-img-url');

                                const currentPlaceholder = imgInput.value;

                                imgInput.value =  extractFilePath(currentPlaceholder);

                            }, 5);
                        });
                    } else if (message.type === 'editingMode') {
                        richtexteditor.isReadOnly = !message.editingMode;
                        richtexteditor.toolbarSettings.enable = !message.editingMode;
                        const editPanel = richtexteditor.contentModule.getEditPanel();
                        if (editPanel) {
                            editPanel.contentEditable = message.editingMode ? 'false' : 'true';
                        }
                        
                    }else if (message.type === 'saveas') {
                        //let sanitizedContent = richtexteditor.sanitizeHtml(richtexteditor.value);
                        vscode.postMessage({
                            type: 'data',
                            file: richtexteditor.value
                        });
                    }
                } catch (error) {
                    vscode.postMessage({
                        type: 'error',
                        error: error.message
                    });
                }
            });
        } catch (error) {
            vscode.postMessage({
                type: 'error',
                error: error.message
            });
        }
    };
})();