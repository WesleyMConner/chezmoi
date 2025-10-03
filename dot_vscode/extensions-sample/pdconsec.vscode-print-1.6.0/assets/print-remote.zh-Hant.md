![](./install-print-on-remote-host.png)

1. 通過按下徽章在遠端主機上安裝 Print（見圖）
2. 正常使用 Print

許多 Markdown 擴展未配置為在遠端主機上運行。這使得它們在從遠端工作區列印 Markdown 時不可用。如果你發現 Markdown 擴展在本地工作，但不能遠端工作，請讓作者添加這個頂級鍵

“extensionKind”： [“workspace”]，

添加到有問題的擴展的 『package.json』 檔案中。