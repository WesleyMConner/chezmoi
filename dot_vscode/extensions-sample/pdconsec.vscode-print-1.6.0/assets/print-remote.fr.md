![](./install-print-on-remote-host.png)

1. Installez Print sur l’hôte distant en cliquant sur le badge (voir illustration) 
2. Utilisez l’impression normalement

De nombreuses extensions Markdown ne sont pas configurées pour s’exécuter sur l’hôte distant. Cela les rend indisponibles lors de l’impression de Markdown à partir d’un espace de travail distant. Si vous constatez qu’une extension Markdown fonctionne localement mais pas à distance, demandez à l’auteur d’ajouter cette clé de niveau supérieur

« extensionKind » : ["espace de travail"],

dans le fichier « package.json » de l’extension incriminée.