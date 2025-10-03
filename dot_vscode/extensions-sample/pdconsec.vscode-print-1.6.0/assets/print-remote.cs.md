![](./install-print-on-remote-host.png)

1. Nainstalujte tiskárnu Print na vzdáleného hostitele kliknutím na odznak (viz obrázek) 
2. Používejte normální tisk

Mnoho rozšíření Markdown není nakonfigurováno pro spuštění na vzdáleném hostiteli. Díky tomu nebudou k dispozici při tisku Markdownu ze vzdáleného pracovního prostoru. Pokud zjistíte, že rozšíření Markdown funguje místně, ale ne vzdáleně, požádejte autora, aby přidal tento klíč nejvyšší úrovně

"extensionKind": ["pracovní prostor"],

do souboru "package.json" problematického rozšíření.