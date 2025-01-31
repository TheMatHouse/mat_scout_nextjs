// ReactQuill WYSIWYG editor and tool tip component
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

const Editor = ({ name, onChange }) => {
  return (
    <ReactQuill
      theme="snow"
      id={name}
      name={name}
      className="quill-editor"
      onChange={onChange}
    />
  );
};

export default Editor;
