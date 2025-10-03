![](./install-print-on-remote-host.png)

1. Instale Print en el host remoto haciendo clic en la insignia (ver ilustración) 
2. Usa Imprimir normalmente

Muchas extensiones de Markdown no están configuradas para ejecutarse en el host remoto. Esto hace que no estén disponibles cuando se imprime Markdown desde un espacio de trabajo remoto. Si encuentra que una extensión de Markdown funciona localmente pero no de forma remota, pida al autor que agregue esta clave de nivel superior

"extensionKind": ["espacio de trabajo"],

al archivo 'package.json' de la extensión infractora.