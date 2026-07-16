import React from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const MODULES = {
  toolbar: [
    [{ header: [2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['blockquote', 'code-block', 'link', 'image'],
    ['clean'],
  ],
};

const RichTextEditor = ({ value, onChange, placeholder }) => (
  <div className="bg-background rounded-md [&_.ql-toolbar]:rounded-t-md [&_.ql-container]:rounded-b-md [&_.ql-editor]:min-h-[220px]">
    <ReactQuill
      theme="snow"
      value={value}
      onChange={onChange}
      modules={MODULES}
      placeholder={placeholder}
    />
  </div>
);

export default RichTextEditor;
