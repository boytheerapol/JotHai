// ============================================================
// JotHai — shared SweetAlert2 theme (§7.8). `Swal` is a CDN global.
// Define once; never re-style per call.
// ============================================================

export const Swal2 = Swal.mixin({
  confirmButtonColor: "#7C3AED",
  customClass: { popup: "jothai-swal" },
});

export const Toast = Swal2.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 1500,
  showClass: { popup: "jothai-toast-show" },
});
