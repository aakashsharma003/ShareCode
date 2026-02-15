import { useEffect, useRef } from "react";
import Codemirror from "codemirror";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/dracula.css";
import "codemirror/mode/javascript/javascript";
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";
import { ACTIONS } from "../Actions";

const Editor = ({ socketRef, roomId, onCodeChange }) => {
  const textareaRef = useRef(null);
  const editorRef = useRef(null);
  const markersRef = useRef({}); // Store markers for each user

  useEffect(() => {
    function init() {
      const textarea = textareaRef.current;
      if (textarea && !editorRef.current) {
        editorRef.current = Codemirror.fromTextArea(textarea, {
          mode: { name: "javascript", json: true },
          theme: "dracula",
          autoCloseTags: true,
          autoCloseBrackets: true,
          lineNumbers: true,
        });

        // Code change handler
        editorRef.current.on('change', (instance, changes) => {
          const { origin } = changes;
          const code = instance.getValue();
          onCodeChange(code);
          if (origin !== 'setValue') {
            socketRef.current.emit(ACTIONS.CODE_CHANGE, {
              roomId,
              code
            });
          }
        });

        // Cursor activity handler
        editorRef.current.on('cursorActivity', (instance) => {
          const cursor = instance.getCursor();
          if (socketRef.current) {
            socketRef.current.emit(ACTIONS.CURSOR_CHANGE, {
              roomId,
              cursor,
              // Username is handled by server via socketId map, or we can send it if stored in context
            });
          }
        });
      }
    }

    init();
  }, []); // Init only once

  useEffect(() => {
    if (socketRef.current) {
      // Code sync
      socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
        if (code !== null && editorRef.current) {
          const currentCode = editorRef.current.getValue();
          if (currentCode !== code) {
            editorRef.current.setValue(code);
          }
        }
      });

      // Cursor sync
      socketRef.current.on(ACTIONS.CURSOR_CHANGE, ({ socketId, cursor, username }) => {
        if (editorRef.current) {
          const cursorColor = getColorForUser(username);

          // Remove old marker for this user
          if (markersRef.current[socketId]) {
            markersRef.current[socketId].forEach(marker => marker.clear());
          }

          // Create cursor element (caret)
          const cursorElement = document.createElement('div');
          cursorElement.className = 'remote-caret';
          cursorElement.style.borderLeftColor = cursorColor;

          // Create flag element (name tag)
          const flagElement = document.createElement('div');
          flagElement.className = 'CodeMirror-cursor-flag';
          flagElement.innerText = username ? username.charAt(0).toUpperCase() : '?';
          flagElement.style.backgroundColor = cursorColor;

          const bookmark = editorRef.current.setBookmark(cursor, { widget: cursorElement });

          // We need a way to show the flag, likely as another widget or absolute positioned
          // Simplified: Just use the widget for the flag + caret
          // Actually Codemirror bookmarks are inline.
          // Let's attach the flag to the cursor element
          cursorElement.appendChild(flagElement);

          markersRef.current[socketId] = [bookmark];
        }
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off(ACTIONS.CODE_CHANGE);
        socketRef.current.off(ACTIONS.CURSOR_CHANGE);
      }
    }
  }, [socketRef.current]);

  // Helper to generate consistent colors from strings
  function getColorForUser(str) {
    if (!str) return '#ccc';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00ffffff).toString(16).toUpperCase();
    return '#' + "00000".substring(0, 6 - c.length) + c;
  }

  return (
    <textarea ref={textareaRef}></textarea>
  );
};

export default Editor;
