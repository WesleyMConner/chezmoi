(function () {
  const vscode = acquireVsCodeApi();
  let pdfViewerContainer;

  window.onload = () => {
    try {

      pdfViewerContainer = new ej.pdfviewer.PdfViewer({
        height: document.documentElement.clientHeight + 'px',
        enablePageOrganizer:false,
        toolbarSettings: {
          showTooltip: true,
          toolbarItems: [
            'PageNavigationTool',
            'MagnificationTool',
            'PanTool',
            'SelectionTool',
            'SearchOption', 
          ],
        },
         resourceUrl: '',
      });
     ej.pdfviewer.PdfViewer.Inject(
          ej.pdfviewer.TextSelection, 
          ej.pdfviewer.TextSearch, 
          ej.pdfviewer.Navigation,
          ej.pdfviewer.Magnification);

      function onCreated() {
        vscode.postMessage({
          type: 'PdfViewerComponentCreated',
        });
      }

      function handleDocumentLoadFailed(args) {
        vscode.postMessage({
          type: 'FileOpeningError',
          error: args.message || 'Failed to load PDF',
          stack: args.stack || '',
        });
      }

      pdfViewerContainer.extractTextOption = "None";
      pdfViewerContainer.enableAnnotation = false;
      pdfViewerContainer.enableFormDesigner = false;
      pdfViewerContainer.enableBookmark = false;
      pdfViewerContainer.initialRenderPages = 100;
      pdfViewerContainer.appendTo('#pdfViewer');
      pdfViewerContainer.addEventListener('created', onCreated);
      pdfViewerContainer.addEventListener('documentLoadFailed', handleDocumentLoadFailed);
       // pdfViewerContainer.addEventListener('resourcesLoaded', onCreated);
      
       vscode.postMessage({
          type: 'PdfViewerComponentCreated',
        });
    } catch (error) {
      vscode.postMessage({
        type: 'pdfViewerInitializationError',
        error: error.message,
        stack: error.stack,
      });
    }

     window.addEventListener('resize', () => {
        pdfViewerContainer.height = document.documentElement.clientHeight + 'px';
        pdfViewerContainer.dataBind(); 
    });
    
    window.addEventListener('message', (event) => {
      try {
        const message = event.data;
        if (message.file) {
          //pdfViewerContainer.documentPath = message.file;
          //pdfViewerContainer.load('data:'+message.file, null);
        setTimeout(() => {
          try {
            pdfViewerContainer.load('data:'+message.file, null); 
            console.log('PDF load initiated'); 
          } catch (loadError) {
            console.error('Error loading PDF:', loadError);
            vscode.postMessage({
              type: 'error',
              error: loadError.message,
              stack: loadError.stack,
            });
          }
        }, 100);
      }
    
      } catch (error) {
        vscode.postMessage({
          type: 'error',
          error: error.message,
          stack: error.stack,
        });
      }
    });
  };
})();