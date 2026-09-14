'use client';

import { Editor } from '@tinymce/tinymce-react';
import type { Editor as TinyMCEEditor } from 'tinymce';
import 'tinymce/tinymce';
import 'tinymce/themes/silver/theme';
import 'tinymce/icons/default/icons';
import 'tinymce/skins/ui/oxide/skin.min.css';
import 'tinymce/plugins/advlist';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/table';
import 'tinymce/plugins/pagebreak';
import 'tinymce/plugins/link';
import 'tinymce/plugins/code';
import 'tinymce/plugins/help';
import 'tinymce/plugins/wordcount';

interface TinyMceEditorProps {
  initialValue: string;
  onInit: (editor: TinyMCEEditor) => void;
}

export default function TinyMceEditor({ initialValue, onInit }: TinyMceEditorProps) {
  return (
    <Editor
      initialValue={initialValue}
      onInit={(_evt, editor) => onInit(editor)}
      init={{
        height: 600,
        menubar: false,
        plugins: ['advlist', 'lists', 'table', 'pagebreak', 'link', 'code', 'help', 'wordcount'],
        toolbar:
          'undo redo | formatselect | bold italic underline subscript superscript | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | table | pagebreak | footnote citation columns trackchange',
        content_style:
          'body { font-family: Georgia, "Times New Roman", serif; font-size: 17px; line-height: 1.8; padding: 2rem; } h1 { font-size: 2rem; margin-bottom: 1.5rem; } p { margin-bottom: 1rem; } table { border-collapse: collapse; width: 100%; margin: 1.5rem 0; } th, td { border: 1px solid #cbd5e1; padding: 0.5rem 0.75rem; text-align: left; } th { background: #f1f5f9; } [data-page-break] { border: 0; border-top: 2px dashed #a78bfa; margin: 2.5rem 0; page-break-after: always; } [data-footnote-body] { border-top: 1px solid #e2e8f0; color: #64748b; display: block; font-size: 0.75rem; margin-top: 0.75rem; padding-top: 0.5rem; } [data-citation] { background: #fef3c7; border-radius: 0.25rem; color: #92400e; padding: 0 0.25rem; } [data-change="inserted"] { background: #dcfce7; text-decoration: underline; }',
        setup: (editor) => {
          editor.ui.registry.addButton('footnote', {
            text: '¹',
            tooltip: 'Insert footnote',
            onAction: () =>
              editor.insertContent(
                '<sup data-footnote="true">[1]</sup><aside data-footnote-body="true"> Add source detail here.</aside>',
              ),
          });
          editor.ui.registry.addButton('citation', {
            text: 'Cite',
            tooltip: 'Insert citation',
            onAction: () => editor.insertContent('<span data-citation="true">[Author, 2026]</span>'),
          });
          editor.ui.registry.addButton('columns', {
            text: 'Cols',
            tooltip: 'Apply two columns',
            onAction: () => {
              const content = editor.getContent();
              if (!content.includes('column-count')) {
                editor.setContent(`<div style="column-count: 2">${content}</div>`);
              }
            },
          });
          editor.ui.registry.addButton('trackchange', {
            text: 'Track',
            tooltip: 'Record tracked change',
            onAction: () => editor.insertContent('<mark data-change="inserted">new text</mark>'),
          });
        },
      }}
    />
  );
}
