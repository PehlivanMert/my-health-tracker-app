// Forms.js
import React, { useState, useEffect, useId } from "react";
import { Box, TextField, Button } from "@mui/material";

export const ExerciseForm = React.memo(
  ({ onSubmit, initialData, setEditingExercise }) => {
    const [formData, setFormData] = useState(
      initialData || { title: "", content: "" }
    );
    const titleId = useId();
    const contentId = useId();

    useEffect(() => {
      if (initialData) setFormData(initialData);
    }, [initialData]);

    const handleSubmit = (e) => {
      e.preventDefault();
      onSubmit(formData);
      setFormData({ title: "", content: "" });
    };

    const handleCancel = () => {
      setFormData({ title: "", content: "" });
      setEditingExercise(null);
    };

    return (
      <Box component="form" onSubmit={handleSubmit} sx={{ mb: 3 }}>
        <TextField
          id={titleId}
          name="title"
          label="Başlık"
          fullWidth
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          sx={{ mb: 2 }}
        />
        <TextField
          id={contentId}
          name="content"
          label="Detaylar"
          multiline
          rows={4}
          fullWidth
          value={formData.content}
          onChange={(e) =>
            setFormData({ ...formData, content: e.target.value })
          }
        />
        <Button
          type="submit"
          variant="contained"
          sx={{ mt: 2 }}
          disabled={!formData.title.trim() || !formData.content.trim()}
        >
          {initialData ? "Güncelle" : "Ekle"}
        </Button>
        {initialData && (
          <Button
            variant="outlined"
            onClick={handleCancel}
            sx={{ mt: 2, ml: 2 }}
          >
            İptal
          </Button>
        )}
      </Box>
    );
  }
);

export const SupplementForm = React.memo(
  ({ onSubmit, initialData, setEditingSupplement }) => {
    const [formData, setFormData] = useState(
      initialData || { title: "", content: "" }
    );
    const titleId = useId();
    const contentId = useId();

    useEffect(() => {
      if (initialData) setFormData(initialData);
    }, [initialData]);

    const handleSubmit = (e) => {
      e.preventDefault();
      onSubmit(formData);
      setFormData({ title: "", content: "" });
    };

    const handleCancel = () => {
      setFormData({ title: "", content: "" });
      setEditingSupplement(null);
    };

    return (
      <Box component="form" onSubmit={handleSubmit} sx={{ mb: 3 }}>
        <TextField
          id={titleId}
          name="title"
          label="Başlık"
          fullWidth
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          sx={{ mb: 2 }}
        />
        <TextField
          id={contentId}
          name="content"
          label="Detaylar"
          multiline
          rows={4}
          fullWidth
          value={formData.content}
          onChange={(e) =>
            setFormData({ ...formData, content: e.target.value })
          }
        />
        <Button
          type="submit"
          variant="contained"
          sx={{ mt: 2 }}
          disabled={!formData.title.trim() || !formData.content.trim()}
        >
          {initialData ? "Güncelle" : "Ekle"}
        </Button>
        {initialData && (
          <Button
            variant="outlined"
            onClick={handleCancel}
            sx={{ mt: 2, ml: 2 }}
          >
            İptal
          </Button>
        )}
      </Box>
    );
  }
);
