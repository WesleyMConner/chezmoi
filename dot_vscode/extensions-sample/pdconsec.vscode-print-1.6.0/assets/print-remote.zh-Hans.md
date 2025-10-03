![](./install-print-on-remote-host.png)

1. 通过单击徽章在远程主机上安装 Print（见图）
2. 正常使用 Print

许多 Markdown 扩展未配置为在远程主机上运行。这使得它们在从远程工作区打印 Markdown 时不可用。如果你发现 Markdown 扩展在本地工作，但不能远程工作，请让作者添加这个顶级键

“extensionKind”： [“workspace”]，

添加到有问题的扩展的 'package.json' 文件中。