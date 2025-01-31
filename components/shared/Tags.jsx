import React from "react";
// Reac tags for adding techniques used
import { ReactTags } from "react-tag-autocomplete";

const Tags = ({ name, selected, suggestions, onAdd, onDelete }) => {
  return (
    <ReactTags
      labelText="Select techniques"
      name={name}
      selected={selected}
      suggestions={suggestions}
      onAdd={onAdd}
      onDelete={onDelete}
      allowNew="true"
      allowResize="true"
      collapseOnSelect="true"
      deleteButtonText="true"
      placeholderText="Press enter to add opponent technique"
    />
  );
};

export default Tags;
