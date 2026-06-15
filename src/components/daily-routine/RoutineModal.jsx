import React, { useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";
import { categoryIcons, categoryNames, categoryColors } from "../../hooks/useDailyRoutineForm";

const RoutineModal = ({ open, onClose, routine, selectedDate, onSave }) => {
  const [formData, setFormData] = useState({
    title: "",
    date: selectedDate || "",
    time: "",
    endTime: "",
    category: "Other",
    repeat: "none",
    repeatCount: 1,
  });

  useEffect(() => {
    if (routine) {
      setFormData({ ...routine });
    } else {
      setFormData({
        title: "",
        date: selectedDate || "",
        time: "",
        endTime: "",
        category: "Other",
        repeat: "none",
        repeatCount: 1,
      });
    }
  }, [routine, selectedDate, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    if (!formData.title || !formData.time) return;
    onSave(formData);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "24px",
          background: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700, color: "#1e293b", textAlign: "center" }}>
        {routine ? "Rutini Düzenle" : "Yeni Rutin Ekle"}
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        <div className="space-y-4 mt-2">
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Başlık</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Örn: Sabah Koşusu"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Kategori Seçin</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {Object.entries(categoryNames).map(([key, name]) => {
                const colorClass = categoryColors[key];
                const isSelected = formData.category === key;
                return (
                  <div
                    key={key}
                    onClick={() => setFormData({ ...formData, category: key })}
                    className={`flex flex-col items-center p-2 rounded-xl cursor-pointer transition-all ${isSelected ? colorClass + ' text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    <div className="text-xl mb-1">{categoryIcons[key]}</div>
                    <span className="text-xs font-medium text-center">{name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tarih</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
            <div></div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Başlangıç Saati</label>
              <input
                type="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bitiş Saati (Opsiyonel)</label>
              <input
                type="time"
                name="endTime"
                value={formData.endTime || ""}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tekrarlama</label>
              <select
                name="repeat"
                value={formData.repeat}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="none">Tekrarlama Yok</option>
                <option value="daily">Günlük</option>
                <option value="weekly">Haftalık</option>
                <option value="monthly">Aylık</option>
              </select>
            </div>
            {formData.repeat !== "none" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tekrar Sayısı</label>
                <input
                  type="number"
                  name="repeatCount"
                  min="1"
                  max="30"
                  value={formData.repeatCount}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            )}
          </div>

        </div>
      </DialogContent>
      <DialogActions sx={{ justifyContent: "center", pb: 3, gap: 2 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            borderRadius: "12px",
            color: "#64748b",
            borderColor: "#cbd5e1",
            textTransform: "none",
            "&:hover": { backgroundColor: "#f1f5f9", borderColor: "#94a3b8" },
          }}
        >
          İptal
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!formData.title || !formData.time}
          sx={{
            borderRadius: "12px",
            backgroundColor: "#3b82f6",
            color: "white",
            textTransform: "none",
            "&:hover": { backgroundColor: "#2563eb" },
          }}
        >
          {routine ? "Güncelle" : "Ekle"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RoutineModal;
