import { Typography, Divider, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import AlertBox from './AlertBox';
import WorkflowSteps from './WorkflowSteps';
import type { WorkflowStep } from './WorkflowSteps';
import ExampleScenario from './ExampleScenario';
import type { ScenarioStep } from './ExampleScenario';

const { Title, Paragraph, Text } = Typography;

const OrdersManual = () => {
  // const { t } = useTranslation(); // Currently not used

  const orderCreationSteps: WorkflowStep[] = [
    {
      step: 1,
      title: "Diller tanlash",
      description: "Buyurtma berilayotgan dillerni tanlang",
      example: "Diller: ALFA DOOR (Toshkent)",
      warning: "Dillerni o'zgartirsangiz barcha mahsulotlar o'chadi!",
    },
    {
      step: 2,
      title: "Mahsulot qo'shish",
      description: "Buyurtma tarkibini to'ldiring va stokni tekshiring",
      example: "Дверь ПГ 800мм — 5 dona — $120/dona = $600",
      warning: "Stokni tekshiring! Agar yetarli bo'lmasa, order bajarilmaydi.",
    },
    {
      step: 3,
      title: "Chegirma berish (ixtiyoriy)",
      description: "Agar kerak bo'lsa chegirma qo'shing",
      example: "10% chegirma yoki $50 fixed amount",
      warning: "100% dan ortiq chegirma berish mumkin emas!",
    },
    {
      step: 4,
      title: "Saqlash va tasdiqlash",
      description: "Orderni saqlang, admin tasdiqlashi kerak",
      success: "✅ Order yaratildi! Raqam: ORD-15.12.2024-001, Status: CREATED",
      info: "Keyingi qadam: Adminni xabardor qiling tasdiqlash uchun",
    },
  ];

  const returnScenarioSteps: ScenarioStep[] = [
    {
      actor: "Diller",
      action: "Mahsulot qaytarish uchun murojaat qiladi",
      note: "Sabab: Rang mos kelmadi, sifat yomon, yoki boshqa",
    },
    {
      actor: "Sotuv menejeri",
      action: "Qaytishni qabul qilishga rozi bo'ladi",
      note: "Kompaniya siyosatiga qarab (masalan, 7 kun ichida)",
    },
    {
      actor: "Omborchi",
      action: "Mahsulotni qabul qiladi va tizimga kiritadi",
      instruction: "Returns → Create Return → Diller tanlash → Mahsulot qo'shish → Holat: Healthy yoki Defect",
      warning: "Agar defekt bo'lsa — 'Defect' tanlang, aks holda 'Healthy'",
    },
    {
      actor: "Sistema",
      action: "Avtomatik hisob-kitob bajaradi",
      result: [
        "✅ Healthy mahsulot → OK stokka qo'shiladi",
        "❌ Defect mahsulot → Defect stokka qo'shiladi",
        "💰 Diller qarzi kamayadi (qaytargan summa)",
      ],
    },
    {
      actor: "Moliyachi",
      action: "Qarzni tekshiradi va tasdiqlaydi",
      note: "Reconciliation PDF yaratiladi",
    },
  ];

  const simpleOrderSteps: ScenarioStep[] = [
    {
      actor: "Sotuv menejeri",
      action: "Orders sahifasiga kiradi",
      instruction: "Chap menu → Orders → Create Order tugmasi",
    },
    {
      actor: "Sotuv menejeri",
      action: "Diller va mahsulotlarni tanlaydi",
      instruction: "Dealer: ALFA DOOR → Add Item → Дверь ПГ 800мм (Белый) → Miqdor: 10 → Narx: $120",
      result: ["Jami: $1,200.00"],
    },
    {
      actor: "Sotuv menejeri",
      action: "Orderni saqlaydi",
      result: [
        "✅ Order yaratildi!",
        "Raqam: ORD-15.12.2024-123",
        "Status: CREATED",
        "Jami: $1,200.00",
      ],
    },
    {
      actor: "Admin",
      action: "Orderni tasdiqlaydi",
      instruction: "Orders → ORD-15.12.2024-123 → Status: CONFIRMED",
    },
    {
      actor: "Omborchi",
      action: "Mahsulotlarni yig'adi va yuboradi",
      instruction: "CONFIRMED → PACKED → SHIPPED → DELIVERED",
    },
  ];

  return (
    <div className="orders-manual space-y-6">
      {/* Header */}
      <div>
        <Title level={2} className="mb-2 text-slate-900 dark:text-slate-100">
          📦 Buyurtmalar (Orders) — To'liq qo'llanma
        </Title>
        <Paragraph className="text-base text-slate-600 dark:text-slate-300">
          Diller buyurtmalarini yaratish, kuzatish va yetkazib berish bo'yicha to'liq ko'rsatma
        </Paragraph>
      </div>

      <Divider />

      {/* Overview */}
      <div className="space-y-4">
        <Title level={3} className="text-slate-900 dark:text-slate-100">
          Umumiy ma'lumot
        </Title>
        <Paragraph className="text-slate-700 dark:text-slate-300">
          <strong>Nima uchun kerak:</strong> Orders moduli — Lenza ERP'ning markaziy qismi. Bu yerda diller
          buyurtmalari yaratiladi, kuzatiladi va bajariladi. Order yaratilishi — qarzning boshlanishi, yetkazilishi —
          daromadning amalga oshishi.
        </Paragraph>

        <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
          <Text strong className="mb-2 block text-sm text-slate-700 dark:text-slate-300">
            Asosiy jarayon:
          </Text>
          <code className="text-xs text-slate-800 dark:text-slate-200">
            Diller murojaat qiladi → Sotuv menejeri order yaratadi (CREATED) → Admin tasdiqlaydi (CONFIRMED) →
            Omborchi yig'adi (PACKED) → Yuboradi (SHIPPED) → Yetkazadi (DELIVERED)
          </code>
        </div>
      </div>

      <Divider />

      {/* Who Uses */}
      <div className="space-y-4">
        <Title level={3} className="text-slate-900 dark:text-slate-100">
          Kim ishlatadi
        </Title>
        <div className="space-y-3">
          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <Text strong className="text-slate-900 dark:text-slate-100">
              👤 Admin:
            </Text>
            <Text className="ml-2 text-slate-700 dark:text-slate-300">
              Barcha orderlarni boshqaradi (yaratish, tahrirlash, o'chirish, statusni o'zgartirish)
            </Text>
          </div>
          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <Text strong className="text-slate-900 dark:text-slate-100">
              📊 Sotuv menejeri:
            </Text>
            <Text className="ml-2 text-slate-700 dark:text-slate-300">
              O'z orderlarini yaratadi (faqat CREATED statusda tahrirlash mumkin)
            </Text>
          </div>
          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <Text strong className="text-slate-900 dark:text-slate-100">
              📦 Omborchi:
            </Text>
            <Text className="ml-2 text-slate-700 dark:text-slate-300">
              Orderlarni bajaradi (faqat ketma-ket status o'zgartirish mumkin: CONFIRMED → PACKED → SHIPPED → DELIVERED)
            </Text>
          </div>
          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <Text strong className="text-slate-900 dark:text-slate-100">
              💰 Moliyachi:
            </Text>
            <Text className="ml-2 text-slate-700 dark:text-slate-300">
              Nazorat qiladi (ko'rish, PDF yuklab olish, tahrirlash mumkin emas)
            </Text>
          </div>
        </div>
      </div>

      <Divider />

      {/* Workflow Steps */}
      <div className="space-y-4">
        <Title level={3} className="text-slate-900 dark:text-slate-100">
          Order yaratish — Bosqichma-bosqich
        </Title>
        <WorkflowSteps title="Order yaratish jarayoni" steps={orderCreationSteps} />
      </div>

      <Divider />

      {/* Critical Warnings */}
      <div className="space-y-4">
        <Title level={3} className="text-slate-900 dark:text-slate-100">
          To'g'ri / Noto'g'ri ishlatish
        </Title>

        <Space direction="vertical" size="middle" className="w-full">
          <AlertBox type="success" title="TAVSIYA ETILADI">
            <ul className="ml-4 list-disc space-y-1">
              <li>Order yaratishdan oldin dillerning faoligini tekshiring</li>
              <li>Mahsulot stokini har doim tekshiring</li>
              <li>Valyuta kursining kiritilganini tasdiqlang</li>
              <li>Order yaratgandan keyin adminni xabardor qiling</li>
            </ul>
          </AlertBox>

          <AlertBox type="warning" title="XAVFLI AMALLAR">
            <ul className="ml-4 list-disc space-y-1">
              <li>CREATED statusdagi orderni 7 kundan ortiq qoldirish (avtomatik bekor qilinadi)</li>
              <li>Statusni sakratib o'tkazish (omborchi uchun)</li>
              <li>Dillerni keyinchalik o'zgartirish (barcha mahsulotlar o'chadi)</li>
            </ul>
          </AlertBox>

          <AlertBox type="error" title="QATIYAN MAN ETILADI">
            <ul className="ml-4 list-disc space-y-1">
              <li>Tasdiqlangan orderni o'chirish</li>
              <li>Stokni tekshirmasdan order yaratish</li>
              <li>Chegirmani noto'g'ri kiritish (150% kabi)</li>
              <li>Valyuta kursini taxminiy kiritish</li>
            </ul>
          </AlertBox>
        </Space>
      </div>

      <Divider />

      {/* Real Examples */}
      <div className="space-y-4">
        <Title level={3} className="text-slate-900 dark:text-slate-100">
          Real hayotiy misollar
        </Title>

        <Space direction="vertical" size="large" className="w-full">
          <ExampleScenario
            title="Oddiy order yaratish"
            type="common"
            steps={simpleOrderSteps}
            conclusion="Order muvaffaqiyatli yaratildi, tasdiqlandi va bajarildi. Diller qarzi $1,200 ga oshdi."
          />

          <ExampleScenario
            title="Diller mahsulot qaytarsa — nima qilinadi?"
            type="common"
            steps={returnScenarioSteps}
            conclusion="Return qayd qilindi, mahsulot stokka qaytdi, diller qarzi kamaydi. Reconciliation PDF yaratildi."
          />
        </Space>
      </div>

      <Divider />

      {/* FAQ */}
      <div className="space-y-4">
        <Title level={3} className="text-slate-900 dark:text-slate-100">
          Tez-tez uchraydigan xatolar
        </Title>

        <Space direction="vertical" size="middle" className="w-full">
          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <Text strong className="text-slate-900 dark:text-slate-100">
              ❓ Order yaratdim, lekin tasdiqlanmayapti
            </Text>
            <Paragraph className="mb-2 mt-2 text-slate-700 dark:text-slate-300">
              <strong>Sabab:</strong> Admin hali ko'rmagan yoki statusni o'zgartirmagan.
            </Paragraph>
            <Paragraph className="text-slate-700 dark:text-slate-300">
              <strong>Yechim:</strong>
              <ol className="ml-4 mt-2 list-decimal space-y-1">
                <li>Orders sahifasida statusni tekshiring — CREATED bo'lishi kerak</li>
                <li>Adminni xabardor qiling (Telegram yoki ichki chat)</li>
                <li>Admin Orders → Status: CONFIRMED qilishi kerak</li>
              </ol>
            </Paragraph>
            <AlertBox type="info">
              ℹ️ CREATED statusdagi orderlar 7 kun ichida avtomatik bekor qilinadi
            </AlertBox>
          </div>

          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <Text strong className="text-slate-900 dark:text-slate-100">
              ❓ "Insufficient stock" xatosi chiqmoqda
            </Text>
            <Paragraph className="mb-2 mt-2 text-slate-700 dark:text-slate-300">
              <strong>Sabab:</strong> Omborda mahsulot yetarli emas.
            </Paragraph>
            <Paragraph className="text-slate-700 dark:text-slate-300">
              <strong>Yechim:</strong>
              <ol className="ml-4 mt-2 list-decimal space-y-1">
                <li>Products sahifasiga o'ting</li>
                <li>Mahsulotni toping</li>
                <li>Stock (OK) ustunini ko'ring</li>
                <li>Agar yetarli bo'lmasa: miqdorni kamaytiring yoki mahsulot kelguncha kuting</li>
              </ol>
            </Paragraph>
          </div>

          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <Text strong className="text-slate-900 dark:text-slate-100">
              ❓ Order o'chirilmayapti
            </Text>
            <Paragraph className="mb-2 mt-2 text-slate-700 dark:text-slate-300">
              <strong>Sabab:</strong> Tasdiqlangan (CONFIRMED yoki undan yuqori) orderlarni o'chirish mumkin emas.
            </Paragraph>
            <Paragraph className="text-slate-700 dark:text-slate-300">
              <strong>Yechim:</strong>
              <ul className="ml-4 mt-2 list-disc space-y-1">
                <li>Agar CREATED statusda bo'lsa — o'chirish mumkin</li>
                <li>Agar CONFIRMED yoki undan yuqori bo'lsa: Admin bilan bog'laning, status CANCELLED ga o'zgartiriladi</li>
              </ul>
            </Paragraph>
            <AlertBox type="info">
              ℹ️ Tasdiqlangan orderlar qarzga ta'sir qiladi, shuning uchun o'chirib bo'lmaydi
            </AlertBox>
          </div>
        </Space>
      </div>
    </div>
  );
};

export default OrdersManual;
