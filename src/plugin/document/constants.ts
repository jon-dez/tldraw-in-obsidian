/**
 * Constants defining the on-disk format of tldraw markdown documents.
 */
export const FILE_EXTENSION = '.md'
export const FRONTMATTER_KEY = 'tldraw-file'
export const TLDATA_DELIMITER_START = '!!!_START_OF_TLDRAW_DATA__DO_NOT_CHANGE_THIS_PHRASE_!!!'
export const TLDATA_DELIMITER_END = '!!!_END_OF_TLDRAW_DATA__DO_NOT_CHANGE_THIS_PHRASE_!!!'
/**
 * The extension used by tldraw offline. A `.tldraw` file is an archive holding a SQLite database
 * and its assets, not the JSON a `.tldr` file holds, so none of our parsing can read one.
 */
export const TLDRAW_OFFLINE_FILE_EXTENSION = '.tldraw'
export const TLDRAW_OFFLINE_UNSUPPORTED_TITLE = 'Can’t open .tldraw files yet'
