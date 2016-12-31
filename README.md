## Extension API
[![Version](http://vsmarketplacebadge.apphb.com/version/spywhere.extension-api.svg)](https://marketplace.visualstudio.com/items?itemName=spywhere.extension-api)
[![Installs](http://vsmarketplacebadge.apphb.com/installs/spywhere.extension-api.svg)](https://marketplace.visualstudio.com/items?itemName=spywhere.extension-api)

Evaluate Visual Studio Code's Extension API

### What is Extension API?
Extension API is simply an extension that let you evaluate Visual Studio Code's extension API without writing an actual extension.
Useful for extension authoring.

### How to use it?
Simply install the extension, Extension API should show the shortcut in the status bar!

You can also use the following commands...

- `Extension API: Evaluate...`: Evaluate the specified JavaScript expression
- `Extension API: Pick Expression...`: Pick the expression from the editor's context (shortcut item default behaviour)

By default, Extension API will show only private (prefixed by `_`) and public properties.
However, you can also show prototype properties (prefixed by `__`) by set the configurations in the settings.
