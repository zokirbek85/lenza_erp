import { Typography, Divider, Space, Table } from 'antd';
import AlertBox from './AlertBox';
import WorkflowSteps from './WorkflowSteps';
import type { WorkflowStep } from './WorkflowSteps';
import ExampleScenario from './ExampleScenario';
import type { ScenarioStep } from './ExampleScenario';

const { Title, Paragraph, Text } = Typography;

const FinanceManual = () => {
  const transactionSteps: WorkflowStep[] = [
    {
      step: 1,
      title: "Hisob tanlash",
      description: "Qaysi hisobga kirim yoki chiqim bo'lishini belgilang",
      example: "Hisob: Naqd (USD) yoki Karta (UZS)",
      warning: "Noto'g'ri hisob tanlansa, pul 'yo'qoladi' — keyin topish qiyin!",
    },
    {
      step: 2,
      title: "Tranzaksiya turini tanlash",
      description: "Income (kirim), Expense (chiqim), Currency Exchange (valyuta), yoki Dealer Refund (qaytarish)",
      example: "Agar diller to'lov qilsa → Income, agar xarajat bo'lsa → Expense",
      info: "Valyuta konvertatsiya uchun Currency Exchange turini tanlang",
    },
    {
      step: 3,
      title: "Summa va ma'lumotlarni kiritish",
      description: "Summa, diller (agar income bo'lsa), kategoriya (agar expense bo'lsa) kiriting",
      example: "Income: $1,000 (Diller: ALFA DOOR) yoki Expense: 5,000,000 UZS (Kategoriya: Ish haqi)",
      warning: "Summani diqqat bilan kiriting — tasdiqlangandan keyin o'zgartirib bo'lmaydi!",
    },
    {
      step: 4,
      title: "Tasdiqlash (Approve)",
      description: "Draft tranzaksiyani Approve qiling",
      success: "✅ Tranzaksiya tasdiqlandi! Hisob balansi avtomatik yangilandi.",
      warning: "Tasdiqlangan tranzaksiyani o'chirish mumkin emas — faqat Cancel qilish mumkin!",
    },
  ];

  const currencyExchangeSteps: ScenarioStep[] = [
    {
      actor: "Moliyachi",
      action: "Valyuta kursini tekshiradi",
      instruction: "Settings → Exchange Rates → Bugungi kurs: 1 USD = 12,700 UZS",
    },
    {
      actor: "Moliyachi",
      action: "Currency Exchange tranzaksiyasini yaratadi",
      instruction: "Finance → Transactions → Create → Type: Currency Exchange Out (USD → UZS)",
      note: "Masalan: $1,000 ni UZS ga o'tkazish kerak",
    },
    {
      actor: "Moliyachi",
      action: "Manba hisob va maqsad hisobni tanlaydi",
      instruction: "From Account: Naqd (USD) → To Account: Naqd (UZS) → Amount: $1,000",
    },
    {
      actor: "Sistema",
      action: "Avtomatik hisoblaydi",
      result: [
        "$1,000 × 12,700 = 12,700,000 UZS",
        "USD hisobdan $1,000 ayriladi",
        "UZS hisobga 12,700,000 UZS qo'shiladi",
      ],
    },
    {
      actor: "Moliyachi",
      action: "Tranzaksiyani tasdiqlaydi",
      instruction: "Status: Draft → Approved",
      result: ["✅ Konvertatsiya bajarildi", "USD hisob: -$1,000", "UZS hisob: +12,700,000 UZS"],
    },
  ];

  const dealerPaymentSteps: ScenarioStep[] = [
    {
      actor: "Diller",
      action: "To'lov qiladi (bank orqali yoki naqd)",
      note: "Masalan: ALFA DOOR kompaniyasi $5,000 to'ladi",
    },
    {
      actor: "Moliyachi",
      action: "To'lovni tizimga kiritadi",
      instruction: "Finance → Transactions → Create → Type: Income → Account: Bank (USD) → Amount: $5,000 → Dealer: ALFA DOOR",
    },
    {
      actor: "Sistema",
      action: "Avtomatik hisob-kitob",
      result: [
        "Bank (USD) hisobga $5,000 qo'shiladi",
        "ALFA DOOR qarzi $5,000 ga kamayadi",
        "Transaction history yaratiladi",
      ],
    },
    {
      actor: "Moliyachi",
      action: "Tasdiqlaydi",
      instruction: "Status: Draft → Approved",
    },
    {
      actor: "Moliyachi",
      action: "Diller balansini tekshiradi",
      instruction: "Dealers → ALFA DOOR → Balance ustuni",
      result: ["✅ Qarz to'g'ri kamaydi", "📄 Reconciliation PDF yaratish mumkin"],
    },
  ];

  const accountColumns = [
    {
      title: 'Hisob turi',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: 'Valyuta',
      dataIndex: 'currency',
      key: 'currency',
    },
    {
      title: 'Qachon ishlatiladi',
      dataIndex: 'usage',
      key: 'usage',
    },
  ];

  const accountData = [
    {
      key: '1',
      type: '💵 Naqd (Cash)',
      currency: 'USD yoki UZS',
      usage: 'Kun davomida naqd to\'lovlar',
    },
    {
      key: '2',
      type: '💳 Karta (Card)',
      currency: 'USD yoki UZS',
      usage: 'Terminal orqali to\'lovlar',
    },
    {
      key: '3',
      type: '🏦 Bank',
      currency: 'USD yoki UZS',
      usage: 'Bank o\'tkazmalari',
    },
  ];

  return (
    <div className="finance-manual space-y-6">
      {/* Header */}
      <div>
        <Title level={2} className="mb-2 text-slate-900 dark:text-slate-100">
          💰 Moliya (Finance) — To'liq qo'llanma
        </Title>
        <Paragraph className="text-base text-slate-600 dark:text-slate-300">
          Pul oqimini kuzatish, to'lovlar, xarajatlar va valyuta konvertatsiyasi bo'yicha to'liq ko'rsatma
        </Paragraph>
      </div>

      <Divider />

      {/* Overview */}
      <div className="space-y-4">
        <Title level={3} className="text-slate-900 dark:text-slate-100">
          Umumiy ma'lumot
        </Title>
        <Paragraph className="text-slate-700 dark:text-slate-300">
          <strong>Nima uchun kerak:</strong> Finance moduli — kompaniyaning pul oqimini boshqaradi. Bu yerda barcha
          kirim-chiqimlar, diller to'lovlari, xarajatlar va valyuta konvertatsiyalari qayd qilinadi.
        </Paragraph>

        <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
          <Text strong className="mb-2 block text-sm text-slate-700 dark:text-slate-300">
            Asosiy vazifalar:
          </Text>
          <ul className="ml-4 list-disc space-y-1 text-sm text-slate-800 dark:text-slate-200">
            <li>Hisoblarni boshqarish (Naqd, Karta, Bank — USD va UZS)</li>
            <li>Kirimlarni qayd qilish (diller to'lovlari)</li>
            <li>Chiqimlarni qayd qilish (xarajatlar)</li>
            <li>Valyuta konvertatsiyasi (USD ↔ UZS)</li>
            <li>Diller refund (ortiqcha to'lovlarni qaytarish)</li>
          </ul>
        </div>
      </div>

      <Divider />

      {/* Account Types */}
      <div className="space-y-4">
        <Title level={3} className="text-slate-900 dark:text-slate-100">
          Hisob turlari
        </Title>
        <Table
          columns={accountColumns}
          dataSource={accountData}
          pagination={false}
          size="small"
          bordered
          className="rounded-lg"
        />
        <AlertBox type="info" title="BILISH KERAK">
          Har bir hisob uchun Opening Balance (boshlang'ich balans) bir marta kiritiladi. Keyinchalik barcha
          tranzaksiyalar avtomatik hisob balansini yangilaydi.
        </AlertBox>
      </div>

      <Divider />

      {/* Transaction Types */}
      <div className="space-y-4">
        <Title level={3} className="text-slate-900 dark:text-slate-100">
          Tranzaksiya turlari
        </Title>
        <div className="space-y-3">
          <div className="rounded-lg border border-green-200 p-3 dark:border-green-800">
            <Text strong className="text-green-700 dark:text-green-300">
              ✅ Income (Kirim):
            </Text>
            <Text className="ml-2 text-slate-700 dark:text-slate-300">
              Diller to'lovlari — hisobga pul tushadi, diller qarzi kamayadi
            </Text>
          </div>
          <div className="rounded-lg border border-red-200 p-3 dark:border-red-800">
            <Text strong className="text-red-700 dark:text-red-300">
              ❌ Expense (Chiqim):
            </Text>
            <Text className="ml-2 text-slate-700 dark:text-slate-300">
              Xarajatlar (ish haqi, arenda, transport) — hisobdan pul chiqadi
            </Text>
          </div>
          <div className="rounded-lg border border-blue-200 p-3 dark:border-blue-800">
            <Text strong className="text-blue-700 dark:text-blue-300">
              🔄 Currency Exchange:
            </Text>
            <Text className="ml-2 text-slate-700 dark:text-slate-300">
              USD ↔ UZS konvertatsiya — bir hisobdan ikkinchisiga o'tkazish
            </Text>
          </div>
          <div className="rounded-lg border border-orange-200 p-3 dark:border-orange-800">
            <Text strong className="text-orange-700 dark:text-orange-300">
              💸 Dealer Refund:
            </Text>
            <Text className="ml-2 text-slate-700 dark:text-slate-300">
              Diller ortiqcha to'lagan bo'lsa qaytarish — hisobdan pul chiqadi, diller qarzi oshadi
            </Text>
          </div>
        </div>
      </div>

      <Divider />

      {/* Workflow */}
      <div className="space-y-4">
        <Title level={3} className="text-slate-900 dark:text-slate-100">
          Tranzaksiya yaratish — Bosqichma-bosqich
        </Title>
        <WorkflowSteps title="Tranzaksiya yaratish jarayoni" steps={transactionSteps} />
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
              <li>Har kuni valyuta kursini yangilang (Settings → Exchange Rates)</li>
              <li>Diller to'lovini darhol qayd qiling (kechiktirmaslik)</li>
              <li>Xarajatlar uchun to'g'ri kategoriya tanlang</li>
              <li>Har hafta hisob balanslarini bank bilan solishtirib turing</li>
            </ul>
          </AlertBox>

          <AlertBox type="warning" title="XAVFLI AMALLAR">
            <ul className="ml-4 list-disc space-y-1">
              <li>Opening balance bir marta kiritiladi — noto'g'ri kiritilsa barcha hisob-kitoblar buziladi</li>
              <li>Valyuta kursini taxminiy kiritish — moliyaviy yo'qotish xavfi</li>
              <li>Bir hisobdan ikkinchisiga o'tkazishda ikki marta yozish (avtomatik ikkalasiga yoziladi)</li>
            </ul>
          </AlertBox>

          <AlertBox type="error" title="QATIYAN MAN ETILADI">
            <ul className="ml-4 list-disc space-y-1">
              <li>Tasdiqlangan (Approved) tranzaksiyani o'chirish — faqat Cancel qilish mumkin</li>
              <li>Noto'g'ri hisob tanlash — pul "yo'qoladi"</li>
              <li>Dillerni tanlamasdan Income kiritish — to'lov "osilib" qoladi</li>
              <li>Valyuta kursini noto'g'ri kiritish — barcha USD/UZS hisob-kitoblar noto'g'ri</li>
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
            title="Diller to'lov qildi — qanday qayd qilinadi?"
            type="common"
            steps={dealerPaymentSteps}
            conclusion="To'lov muvaffaqiyatli qayd qilindi, bank hisobga $5,000 qo'shildi, diller qarzi kamaydi."
          />

          <ExampleScenario
            title="USD'ni UZS ga o'tkazish (Currency Exchange)"
            type="common"
            steps={currencyExchangeSteps}
            conclusion="$1,000 muvaffaqiyatli UZS ga o'tkazildi. USD hisob kamaydi, UZS hisob oshdi. Valyuta kursi to'g'ri qo'llandi."
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
              ❓ Valyuta kursi qaerda o'zgartiriladi?
            </Text>
            <Paragraph className="mb-2 mt-2 text-slate-700 dark:text-slate-300">
              <strong>Javob:</strong> Settings → Exchange Rates → Add Rate
            </Paragraph>
            <Paragraph className="text-slate-700 dark:text-slate-300">
              Har kuni yangi kurs qo'shiladi (masalan, 1 USD = 12,700 UZS)
            </Paragraph>
            <AlertBox type="warning">
              ⚠️ Noto'g'ri kurs kiritilsa, barcha USD/UZS konvertatsiyalar noto'g'ri hisoblanadi!
            </AlertBox>
          </div>

          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <Text strong className="text-slate-900 dark:text-slate-100">
              ❓ Tasdiqlangan tranzaksiyani o'zgartirish kerak — qanday qilish mumkin?
            </Text>
            <Paragraph className="mb-2 mt-2 text-slate-700 dark:text-slate-300">
              <strong>Javob:</strong> Tasdiqlangan tranzaksiyani o'zgartirish mumkin emas!
            </Paragraph>
            <Paragraph className="text-slate-700 dark:text-slate-300">
              <strong>Yechim:</strong>
              <ol className="ml-4 mt-2 list-decimal space-y-1">
                <li>Tranzaksiyani Cancel qiling (bekor qilish)</li>
                <li>Yangi to'g'ri tranzaksiya yarating</li>
                <li>Yangi tranzaksiyani Approve qiling</li>
              </ol>
            </Paragraph>
            <AlertBox type="info">
              ℹ️ Cancel qilingan tranzaksiya history'da saqlanadi, lekin hisob balansiga ta'sir qilmaydi
            </AlertBox>
          </div>

          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <Text strong className="text-slate-900 dark:text-slate-100">
              ❓ Hisob balansi bank bilan mos kelmayapti — nima qilish kerak?
            </Text>
            <Paragraph className="mb-2 mt-2 text-slate-700 dark:text-slate-300">
              <strong>Sabablari:</strong>
            </Paragraph>
            <ul className="ml-4 list-disc space-y-1 text-slate-700 dark:text-slate-300">
              <li>Opening balance noto'g'ri kiritilgan</li>
              <li>Ba'zi tranzaksiyalar qayd qilinmagan</li>
              <li>Ikki marta qayd qilingan tranzaksiya bor</li>
              <li>Cancelled tranzaksiya hisobga kiritilgan</li>
            </ul>
            <Paragraph className="mt-2 text-slate-700 dark:text-slate-300">
              <strong>Yechim:</strong>
              <ol className="ml-4 mt-2 list-decimal space-y-1">
                <li>Finance → Transactions → Barcha tranzaksiyalarni ko'rib chiqing</li>
                <li>Bank statementni yuklab oling</li>
                <li>Birma-bir tranzaksiyalarni solishtirib turing</li>
                <li>Qayd qilinmagan tranzaksiyalarni qo'shing</li>
                <li>Xato tranzaksiyalarni Cancel qiling</li>
              </ol>
            </Paragraph>
          </div>
        </Space>
      </div>

      <Divider />

      {/* Best Practices */}
      <div className="space-y-4">
        <Title level={3} className="text-slate-900 dark:text-slate-100">
          ⚡ Eng yaxshi amaliyotlar
        </Title>
        <div className="space-y-3">
          <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
            <Text strong className="text-green-800 dark:text-green-300">
              ✅ Kundalik ishlar:
            </Text>
            <ul className="ml-4 mt-2 list-disc space-y-1 text-sm text-green-700 dark:text-green-200">
              <li>Valyuta kursini yangilash (har kuni ertalab)</li>
              <li>Diller to'lovlarini darhol qayd qilish</li>
              <li>Xarajatlarni oxirgi soatda kiritish</li>
            </ul>
          </div>

          <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
            <Text strong className="text-blue-800 dark:text-blue-300">
              📊 Haftalik ishlar:
            </Text>
            <ul className="ml-4 mt-2 list-disc space-y-1 text-sm text-blue-700 dark:text-blue-200">
              <li>Hisob balanslarini bank bilan solishtirib turish</li>
              <li>Pending (Draft) tranzaksiyalarni tekshirish va tasdiqlash</li>
              <li>Xarajat kategoriyalarini tahlil qilish</li>
            </ul>
          </div>

          <div className="rounded-lg bg-orange-50 p-4 dark:bg-orange-900/20">
            <Text strong className="text-orange-800 dark:text-orange-300">
              📅 Oylik ishlar:
            </Text>
            <ul className="ml-4 mt-2 list-disc space-y-1 text-sm text-orange-700 dark:text-orange-200">
              <li>To'liq moliyaviy hisobot yaratish</li>
              <li>Bank reconciliation (sverka)</li>
              <li>Xarajatlar bo'yicha tahlil</li>
              <li>Database backup olish</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceManual;
