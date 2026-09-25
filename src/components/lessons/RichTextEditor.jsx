import React from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// Par défaut, Quill insère les images en base64 (data:), refusées par l'assainissement
// (SEC-003) : on demande une URL http(s) à la place.
function insertImageFromUrl() {
  const url = window.prompt("Adresse de l'image (https://…)");
  if (!url || !/^https?:\/\//i.test(url.trim())) return;
  const range = this.quill.getSelection(true);
  this.quill.insertEmbed(range.index, 'image', url.trim(), 'user');
}

const MODULES = {
  toolbar: {
    container: [
      [{ header: [2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['blockquote', 'code-block', 'link', 'image'],
      ['clean'],
    ],
    handlers: { image: insertImageFromUrl },
  },
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
