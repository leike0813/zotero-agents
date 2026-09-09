# 
	dev:client_coding:javascript_api [Zotero Documentation]

Zotero JavaScript API
---------------------

Whereas Zotero's [Web API](https://www.zotero.org/support/dev/web_api "dev:web_api") allows read and write access to online Zotero libraries, it is also possible to access the local Zotero client through the local JavaScript API. (It is also possible to [directly access the local SQLite database](https://www.zotero.org/support/dev/client_coding/direct_sqlite_database_access "dev:client_coding:direct_sqlite_database_access"), but that approach is much more fragile.)

Note that this documentation of the JavaScript API is not comprehensive. If you use the JavaScript API in ways beyond what's described here, please consider expanding this wiki page or suggesting changes in the forums.

Running Ad Hoc JavaScript in Zotero
-----------------------------------

Zotero includes an option to run arbitrary privileged JavaScript:

1.  In the Tools → Developer menu, select Run JavaScript. Opening the Error Console, which appears in the same menu, will also be helpful.
    
2.  In the window that opens, enter some JavaScript in the Code textbox and click Run or press Cmd-R/Ctrl-R.
    

When running **asynchronous** code containing `await`, the entered code is wrapped in an [async function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function"), allowing you to wait for the resolution of promises returned by functions. Most Zotero functions that access the database, disk, or network are asynchronous. In this mode, the value of a `return` statement will be displayed in the right-hand pane upon successful completion. E.g. returning the currently selected item(s)

```
var items = Zotero.getActiveZoteroPane().getSelectedItems();
return items;
```


In **synchronous** mode, the value of the final line will appear in the right-hand pane. The same result as above could be achieved in synchronous mode with

```
var items = Zotero.getActiveZoteroPane().getSelectedItems();
items;
```


Zotero Code Architecture
------------------------

### Window Scope vs. Non-Window Scope

Zotero code exists in either window scope and non-window scope.

Window scope applies to code that runs within either the main Zotero window or a secondary window (e.g., the Advanced Search window). It has access to the window's DOM and can interact with the UI. The main window-scope object in Zotero is `ZoteroPane`, from zoteroPane.js, which controls most interactions triggered in the main Zotero window.

Non-window scope applies to lower-level code that doesn't have access to the DOM. This includes the core `Zotero` object, which contains all other non-window code, including the data layer used for retrieving and modifying library data. In Zotero, non-window code is contained within the `xpcom` subdirectory.

Windows in Zotero can import the core `Zotero` object via the include.js script. Zotero methods can then be called from anywhere within the window's scope simply by calling, for example, `var item = Zotero.Items.get(1);`.

To access Zotero functionality from your own extension, you will need access to the core `Zotero` object. If your extension operates within the main Zotero window, you already have access to the `Zotero` object and don’t need to take further steps. Otherwise, you can import the Zotero object into other windows by including the script chrome://zotero/content/include.js within an HTML or XUL file:

```
<script src="chrome://zotero/content/include.js"><script>
```


Once you have `Zotero`, you can get the current `ZoteroPane` object:

```
var zp = Zotero.getActiveZoteroPane();
var items = zp.getSelectedItems();
```


(The Zotero pane will always be available unless the main window is closed, as is possible on macOS.)

### Notification System

Zotero has a built-in notification system that allows other privileged code to be notified when a change is made via the data layer — for example, when an item is added to the library. Within Zotero itself, this is used mostly to update the UI when items change, but extensions can use the system to perform additional operations when specific events occur — say, to sync item metadata with a web-based API.

Available events:

*   add (c, s, i, t, ci, it)
    
*   modify (c, s, i, t)
    
*   delete (c, s, i, t)
    
*   remove (ci, it)
    
*   move (c, for changing collection parent)
    

c = collection, s = search (saved search), i = item, t = tag, ci = collection-item, it = item-tag

See the Zotero [Sample Plugin](https://www.zotero.org/support/dev/sample_plugin "dev:sample_plugin") for a demonstration.

API Methods
-----------

_The Zotero JavaScript API is under-documented, and at present requires a lot of looking around in the source code. The most useful parts of the source code are in chrome/content/zotero/xpcom and xpcom/data, and the chrome/content/zotero (particularly zoteroPane.js and fileInterface.js)._

### Adding items and modifying data

A typical operation might include a call to `Zotero.Items.get()` to retrieve a `Zotero.Item` instance, calls to `Zotero.Item` methods on the retrieved object to modify data, and finally a `save()` (within a transaction) or `saveTx()` (outside a transaction) to save the modified data to the database.

```
var item = new Zotero.Item('book');
item.setField('title', 'Much Ado About Nothing');
item.setCreators(
    [
        {
            firstName: "William",
            lastName: "Shakespeare",
            creatorType: "author"
        }
    ]
);
var itemID = await item.saveTx();
return itemID;
```


```
// Fetch saved items with Items.get(itemID)
var item = Zotero.Items.get(itemID);
 
alert(item.getField('title')); // "Much Ado About Nothing"
 
alert(item.getCreator(0)); // {'firstName'=>'William', 'lastName'=>'Shakespeare',
                           //   'creatorTypeID'=>1, 'fieldMode'=>0}
// Alternative format
alert(item.getCreatorJSON(0)); // {'firstName'=>'William', 'lastName'=>'Shakespeare',
                           //   'creatorType'=>'author'}
 
item.setField('place', 'England');
item.setField('date', 1599);
await item.saveTx(); // update database with new data
```


### Get the Zotero Pane to interact with the Zotero UI

```
var ZoteroPane = Zotero.getActiveZoteroPane();
```


Then grab the currently selected items from the Zotero pane:

```
// Get first selected item
var selectedItems = ZoteroPane.getSelectedItems();
var item = selectedItems[0];
 
// Proceed if an item is selected and it isn't a note
if (item && !item.isNote()) {
    if (item.isAttachment()) {
        // find out about attachment
    }
    if (item.isRegularItem()) {
        // We could grab attachments:
        // let attachmentIDs = item.getAttachments();
        // let attachment = Zotero.Items.get(attachmentIDs[0]);
    }
    alert(item.id);
}
```


### Collection Operations

#### Get the items in the selected collection

```
var collection = ZoteroPane.getSelectedCollection();
var items = collection.getChildItems();
// or you can obtain an array of itemIDs instead:
var itemIDs = collection.getChildItems(true);
```


#### Create a subcollection of the selected collection

```
var currentCollection = ZoteroPane.getSelectedCollection();
var collection = new Zotero.Collection();
collection.name = name;
collection.parentID = currentCollection.id;
var collectionID = await collection.saveTx();
return collectionID;
```


### Zotero Search Basics

If you are focused on data access, the first thing you will want to do will be to retrieve items from your Zotero library. Creating an in-memory search is a good start.

```
var s = new Zotero.Search();
s.libraryID = Zotero.Libraries.userLibraryID;
```


#### Search for items containing a specific tag

Starting with the above code, we then use the following code to retrieve items in My Library with a particular tag:

```
s.addCondition('tag', 'is', 'tag name here');
var itemIDs = await s.search();
```


#### Advanced searches

```
var s = new Zotero.Search();
s.libraryID = Zotero.Libraries.userLibraryID;
s.addCondition('joinMode', 'any'); // joinMode defaults to 'all' as per the 
                                        // advanced search UI
```


To add the other conditions available in the advanced search UI, use the following:

```
s.addCondition('recursive', 'true');  // equivalent of "Search subfolders" checked
s.addCondition('noChildren', 'true'); //               "Only show top level children
s.addCondition('includeParentsAndChildren', 'true');   "Include parent and child ..."
```


There are also some “hidden” search conditions around line 1735 of chrome/content/zotero/xpcom/search.js in the Zotero source code (although some should only be used internally). \[TODO remove mention of source code and enumerate all conditions\]

One example is:

```
s.addCondition('deleted', 'true');  // Include deleted items
```


#### Search by collection

To search for a collection or a saved search you need to know the ID or key:

```
s.addCondition('collectionID', 'is', collectionID); // e.g., 52
s.addCondition('savedSearchID', 'is', savedSearchID);
```


```
s.addCondition('collection', 'is', collectionKey); // e.g., 'C72FDAP2'
s.addCondition('savedSearch', 'is', savedSearchKey);
```


#### Search by creator

```
var name = 'smith';
s.addCondition('creator', 'contains', name);
```


#### Search by tag

To search by tag, you use the tag text:

```
var tagName = 'something';
s.addCondition('tag', 'is', tagName);
```


#### Search by other fields

The complete list of other fields available to search on is on the [search fields](https://www.zotero.org/support/dev/client_coding/javascript_api/search_fields "dev:client_coding:javascript_api:search_fields") page.

### Executing the search

Once the search conditions have been set up, then it's time to execute the results:

```
var itemIDs = await s.search();
```


This returns the item ids in the search as an array. The next thing to do is to get the Zotero items for the array of IDs:

```
var items = await Zotero.Items.getAsync(itemIDs);
```


### Managing citations and bibliographies

TODO: this is pretty sparse. the rtfscan code is a good place to look for some guidance.

#### Getting a bibliography for an array of items:

Here we use Zotero's Quick Copy functions to get a bibliography in the style specified in Zotero's preferences. We will in the following example create this bibliography from all currently selected items.

```
var items = Zotero.getActiveZoteroPane().getSelectedItems();
var qc = Zotero.QuickCopy;
var format = Zotero.Prefs.get("export.quickCopy.setting");
if (format.split("=")
[0] !== "bibliography") {
   alert("No bibliography style is choosen in the settings for QuickCopy.");
}
var biblio = qc.getContentFromItems(items, format);
var biblio_html_format = biblio.html;
var biblio_txt = biblio.text;
```


If you instead want to have the citation string then simply replace the 7th line with `var biblio = qc.getContentFromItems(items, format, null, true);`.

#### Get a list of available styles

```
await Zotero.Schema.schemeUpdatePromise;
var styles = Zotero.Styles.getVisible();
var styleInfo = [];
for (let style of styles) {
    styleInfo.push({ id: style.styleID, name: style.title });
}
return styleInfo;
```


TODO: change the style. get stuff in other formats, especially RTF

### Get information about an item.

TODO: need to list all the possible fields here, and what kind of entry they belong to.

To get an item's abstract, we get the 'abstractNote' field from the Zotero item:

```
var abstract = item.getField('abstractNote');
```


### Get child notes for an item

To get the child notes for an item, we use the following code:

```
var noteIDs = item.getNotes();
```


This returns an array of ids of note items. To get each note in turn we just iterate through the array:

```
for (let id of noteIDs) {
    let note = Zotero.Items.get(id);
    let noteHTML = note.getNote();
} 
```


```
var relatedItems = item.relatedItems;
```


Given two items `itemA` and `itemB`. We can set them as related items to each other by using the `addRelatedItem` function:

```
itemA.addRelatedItem(itemB);
await itemA.saveTx();
itemB.addRelatedItem(itemA);
await itemB.saveTx();
```


### Get an item's attachments

Here's some example code to get the full text of HTML and PDF items in storage and put the data in an array:

```
var item = ZoteroPane.getSelectedItems()
[0];
var fulltext = [];
if (item.isRegularItem()) { // not an attachment already
    let attachmentIDs = item.getAttachments();
    for (let id of attachmentIDs) {
        let attachment = Zotero.Items.get(id);
        if (attachment.attachmentContentType == 'application/pdf'
                || attachment.attachmentContentType == 'text/html') {
            fulltext.push(await attachment.attachmentText);
        }
    }
}
return fulltext;
```


### File I/O

#### Getting the contents of a file

```
var path = '/Users/user/Desktop/data.json';
var data = await Zotero.File.getContentsAsync(path);
```


#### Saving data to a file

```
var path = '/Users/user/Desktop/file.txt';
var data = "This is some text.";
await Zotero.File.putContentsAsync(path, data);
```


### To Do

*   Select a Zotero saved search
    
*   Combining search terms
    
*   Complete list of search operators
    
*   Complete list of search fields - with description of what the more obscure fields mean - e.g. abstractNote for abstract, and how do we search the fulltext archive?
    
*   fulltext for an item
    
*   Get stored attachments for an item
    

Batch Editing
-------------

The JavaScript API provides a powerful way to script changes to your Zotero library. The common case of search-and-replace is accomplished easily using a basic script in the [JavaScript runner](#running_ad_hoc_javascript_in_zotero "dev:client_coding:javascript_api ↵").

Before proceeding, back up your [Zotero data directory](https://www.zotero.org/support/zotero_data "zotero_data") and temporarily disable auto-sync in the Sync pane of the Zotero preferences.

All examples operate on the currently selected library.

### Example: Item Field Changes

Edit the first three lines as necessary:

```
var fieldName = "publicationTitle";
var oldValue = "Foo";
var newValue = "Foo2";
 
var fieldID = Zotero.ItemFields.getID(fieldName);
var s = new Zotero.Search();
s.libraryID = ZoteroPane.getSelectedLibraryID();
s.addCondition(fieldName, 'is', oldValue);
var ids = await s.search();
if (!ids.length) {
    return "No items found";
}
await Zotero.DB.executeTransaction(async function () {
    for (let id of ids) {
        let item = await Zotero.Items.getAsync(id);
        let mappedFieldID = Zotero.ItemFields.getFieldIDFromTypeAndBase(item.itemTypeID, fieldName);
        item.setField(mappedFieldID ? mappedFieldID : fieldID, newValue);
        await item.save();
    }
});
return ids.length + " item(s) updated";
```


The list of field names to use can be retrieved via the web API:

[https://api.zotero.org/itemFields?pprint=1](https://api.zotero.org/itemFields?pprint=1 "https://api.zotero.org/itemFields?pprint=1").

### Example: Creator Name Changes

Edit the first four lines as necessary:

```
var oldName = "Robert L. Smith";
var newFirstName = "Robert";
var newLastName = "Smith";
var newFieldMode = 0; // 0: two-field, 1: one-field (with empty first name)
 
var s = new Zotero.Search();
s.libraryID = ZoteroPane.getSelectedLibraryID();
s.addCondition('creator', 'is', oldName);
var ids = await s.search();
if (!ids.length) {
    return "No items found";
}
await Zotero.DB.executeTransaction(async function () {
    for (let id of ids) {
        let item = await Zotero.Items.getAsync(id);
        let creators = item.getCreators();
        let newCreators = [];
        for (let creator of creators) {
        	if (`${creator.firstName} ${creator.lastName}`.trim() == oldName) {
        		creator.firstName = newFirstName;
        		creator.lastName = newLastName;
        		creator.fieldMode = newFieldMode;
        	}
        	newCreators.push(creator);
        }
        item.setCreators(newCreators);
        await item.save();
    }
});
return ids.length + " item(s) updated";
```


### Example: Convert Manual Tag to Automatic

Note that this will change all instances of the tag in the library.

Replace “Foo” in the first line with the tag to change:

```
var tag = "Foo";
var s = new Zotero.Search();
s.libraryID = ZoteroPane.getSelectedLibraryID();
s.addCondition('tag', 'is', tag);
var ids = await s.search();
if (!ids.length) {
    return "No items found";
}
await Zotero.DB.executeTransaction(async function () {
    for (let id of ids) {
        let item = Zotero.Items.get(id);
        item.addTag(tag, 1);
        await item.save({
            skipDateModifiedUpdate: true
        });
    }
});
return ids.length + " tag(s) updated";
```


### Example: Delete Tags By Part of Name

This example has not been updated for Zotero 5 and should not currently be used.

```
var tags = ["foo", "bar", "baz"];
var ids = [];
tags.forEach(function (tag) {
    ids = ids.concat(Object.keys(Zotero.Tags.search(tag)));
});
Zotero.Tags.erase(ids);
```
