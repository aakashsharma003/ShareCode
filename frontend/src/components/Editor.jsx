import { useEffect, useRef } from "react";
import Codemirror from "codemirror";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/dracula.css";
import "codemirror/mode/javascript/javascript";
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";
import { ACTIONS } from "../Actions";

const Editor = ({socketRef, roomId, onCodeChange}) => {
  const textareaRef = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => {
    function init() {
      const textarea = textareaRef.current;
      if (textarea) {
        // Initialize CodeMirror on the textarea
        editorRef.current = Codemirror.fromTextArea(textarea, {
          mode: { name: "javascript", json: true },
          theme: "dracula",
          autoCloseTags: true,
          autoCloseBrackets: true,
          lineNumbers: true,

        });

         editorRef.current.on('change',(instance, changes) => {
          // console.log('changes', changes);
           const {origin} = changes;
           const code = instance.getValue();
           onCodeChange(code);
           if(origin !== 'setValue'){
            socketRef.current.emit(ACTIONS.CODE_CHANGE,{
              roomId,
              code
            });
           }
          //  console.log(code);
         })

      }
    }

    init();
  }, []);

  useEffect(() => {
    if(socketRef.current){
      socketRef.current.on(ACTIONS.CODE_CHANGE, ({code}) => {
        console.log('receiving', code);
        if(code !== null){
          editorRef.current.setValue(code);
        }
      })
    }
    return () => {
      socketRef.current.off(ACTIONS.CODE_CHANGE);
    }
  },[socketRef.current]);

  return (
    
      <textarea
        ref={textareaRef}
      ></textarea>
  );
};

export default Editor;
