import { useState } from "react";

export const useWellnessForm = (onSaveSupplement) => {
  const [openSupplementDialog, setOpenSupplementDialog] = useState(false);
  const [supplementForm, setSupplementForm] = useState({
    name: "",
    quantity: 0,
    dailyUsage: 1,
  });
  const [editingSupplement, setEditingSupplement] = useState(null);

  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [supplementNotificationDialogOpen, setSupplementNotificationDialogOpen] = useState(false);
  const [waterNotifDialogOpen, setWaterNotifDialogOpen] = useState(false);

  const handleOpenSupplementDialog = () => {
    setEditingSupplement(null);
    setSupplementForm({ name: "", quantity: 0, dailyUsage: 1 });
    setOpenSupplementDialog(true);
  };

  const handleCloseSupplementDialog = () => {
    setOpenSupplementDialog(false);
    setEditingSupplement(null);
  };

  const handleEditSupplement = (supplement) => {
    setEditingSupplement(supplement);
    setSupplementForm({
      name: supplement.name,
      quantity: supplement.quantity,
      dailyUsage: supplement.dailyUsage,
    });
    setOpenSupplementDialog(true);
  };

  const handleSave = async () => {
    await onSaveSupplement(editingSupplement, supplementForm);
    setOpenSupplementDialog(false);
    setEditingSupplement(null);
    setSupplementForm({ name: "", quantity: 0, dailyUsage: 1 });
  };

  return {
    openSupplementDialog,
    supplementForm,
    setSupplementForm,
    editingSupplement,
    notificationDialogOpen,
    setNotificationDialogOpen,
    supplementNotificationDialogOpen,
    setSupplementNotificationDialogOpen,
    waterNotifDialogOpen,
    setWaterNotifDialogOpen,
    handleOpenSupplementDialog,
    handleCloseSupplementDialog,
    handleEditSupplement,
    handleSave,
  };
};
