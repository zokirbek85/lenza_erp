// @ts-nocheck
// EXAMPLE: Boshqa komponentlardan StatusChangeContext ishlatish

import { useStatusChange } from '../context/StatusChangeContext';

// Misol 1: Oddiy funksiya komponenti ichida
function SomeOrderComponent({ orderId, currentStatus }) {
  const { showStatusChangeModal } = useStatusChange();

  const handleQuickStatusChange = () => {
    // Tez status o'zgartirish (masalan, tugma bosilganda)
    showStatusChangeModal(
      currentStatus,
      'confirmed',
      orderId,
      (updatedStatus) => {
        console.log('Status updated to:', updatedStatus);
        // Kerakli yangilanishlarni bajaring
      }
    );
  };

  return (
    <button onClick={handleQuickStatusChange}>
      Tez tasdiqlash
    </button>
  );
}

// Misol 2: Table action buttonlarida
function OrderActionsMenu({ order }) {
  const { showStatusChangeModal } = useStatusChange();

  const actions = [
    {
      label: 'Tasdiqlash',
      onClick: () => showStatusChangeModal(
        order.status,
        'confirmed',
        order.id,
        (newStatus) => {
          // State yangilansin
        }
      ),
    },
    {
      label: "Jo'natish",
      onClick: () => showStatusChangeModal(
        order.status,
        'shipped',
        order.id,
      ),
    },
  ];

  return (
    <div>
      {actions.map(action => (
        <button key={action.label} onClick={action.onClick}>
          {action.label}
        </button>
      ))}
    </div>
  );
}

// Misol 3: Bulk actions (ko'plab buyurtmalarni bir vaqtda)
function BulkStatusChanger({ selectedOrderIds, currentStatus }) {
  const { showStatusChangeModal } = useStatusChange();

  const handleBulkChange = (newStatus) => {
    // Har bir order uchun
    selectedOrderIds.forEach(orderId => {
      showStatusChangeModal(
        currentStatus,
        newStatus,
        orderId,
        (updatedStatus) => {
          console.log(`Order ${orderId} updated to ${updatedStatus}`);
        }
      );
    });
  };

  return (
    <div>
      <button onClick={() => handleBulkChange('confirmed')}>
        Barchasini tasdiqlash
      </button>
      <button onClick={() => handleBulkChange('cancelled')}>
        Barchasini bekor qilish
      </button>
    </div>
  );
}

export { SomeOrderComponent, OrderActionsMenu, BulkStatusChanger };
