![](./install-print-on-remote-host.png)

1. Zainstaluj funkcję Print na zdalnym hoście, klikając plakietkę (patrz ilustracja) 
2. Używaj funkcji Drukuj normalnie

Wiele rozszerzeń języka Markdown nie jest skonfigurowanych do uruchamiania na hoście zdalnym. To sprawia, że są one niedostępne podczas drukowania języka Markdown ze zdalnego obszaru roboczego. Jeśli okaże się, że rozszerzenie języka Markdown działa lokalnie, ale nie zdalnie, poproś autora o dodanie tego klucza najwyższego poziomu

"extensionKind": ["obszar roboczy"],

do pliku "package.json" obraźliwego rozszerzenia.