![](./install-print-on-remote-host.png)

1. Installare Print sull'host remoto facendo clic sul badge (vedere l'illustrazione) 
2. Utilizzare la stampa normalmente

Molte estensioni Markdown non sono configurate per l'esecuzione nell'host remoto. Ciò li rende non disponibili quando si stampa Markdown da un'area di lavoro remota. Se si scopre che un'estensione Markdown funziona localmente ma non in remoto, chiedere all'autore di aggiungere questa chiave di primo livello

"extensionKind": ["spazio di lavoro"],

al file 'package.json' dell'estensione incriminata.