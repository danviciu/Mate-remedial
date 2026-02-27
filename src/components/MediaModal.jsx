import Modal from "../ui/Modal.jsx";

export default function MediaModal({
  open,
  onClose,
  title = "Previzualizare",
  children,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="max-w-4xl"
      panelClassName="bg-white/98"
    >
      <div className="rounded-2xl bg-slate-50 p-3 sm:p-4">{children}</div>
    </Modal>
  );
}
