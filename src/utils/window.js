export { isWindowAlive };
/**
 * Check if the window is alive.
 * Useful to prevent opening duplicate windows.
 * @param win
 */
function isWindowAlive(win) {
    return !!(win && !Components.utils.isDeadWrapper(win) && !win.closed);
}
