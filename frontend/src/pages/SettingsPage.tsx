import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Button as AntButton, Card, Form, Input, Upload, message } from 'antd';
import type { UploadChangeParam } from 'antd/es/upload';
import type { UploadFile } from 'antd/es/upload/interface';
import { SaveOutlined, UploadOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';

import http from '../app/http';
import { useAuthStore } from '../auth/useAuthStore';

interface SystemConfig {
  LOW_STOCK_THRESHOLD: number;
  BACKUP_PATH: string;
  DEFAULT_EXCHANGE_RATE: string;
  [key: string]: unknown;
}

const { TextArea } = Input;

interface CompanyInfoFormValues {
  name?: string;
  slogan?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  bank_name?: string;
  account_number?: string;
  inn?: string;
  mfo?: string;
  director?: string;
}

interface CompanyInfoPayload extends CompanyInfoFormValues {
  id?: number;
  logo?: string | null;
}

const SettingsPage = () => {
  const { role } = useAuthStore();
  const [telegramId, setTelegramId] = useState('');
  const [connected, setConnected] = useState(false);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [companyForm] = Form.useForm<CompanyInfoFormValues>();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [companyInfoId, setCompanyInfoId] = useState<number | null>(null);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const isAdmin = role === 'admin';

  useEffect(() => {
    const fetchLink = async () => {
      try {
        const response = await http.get<{ telegram_id: string | null }>('/api/telegram/link/');
        if (response.data.telegram_id) {
          setTelegramId(response.data.telegram_id);
          setConnected(true);
        }
      } catch (error) {
        console.warn(error);
      }
    };
    fetchLink();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const loadConfig = async () => {
      const response = await http.get<SystemConfig>('/api/system/config/');
      setConfig(response.data);
    };
    loadConfig();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const loadCompanyInfo = async () => {
      setCompanyLoading(true);
      try {
        const response = await http.get<CompanyInfoPayload[] | CompanyInfoPayload>('/api/company-info/');
        const payload: CompanyInfoPayload | undefined = Array.isArray(response.data)
          ? response.data[0]
          : response.data;
        if (payload) {
          setCompanyInfoId(payload.id ?? null);
          const fields: CompanyInfoFormValues = {
            name: payload.name ?? '',
            slogan: payload.slogan ?? '',
            address: payload.address ?? '',
            phone: payload.phone ?? '',
            email: payload.email ?? '',
            website: payload.website ?? '',
            bank_name: payload.bank_name ?? '',
            account_number: payload.account_number ?? '',
            inn: payload.inn ?? '',
            mfo: payload.mfo ?? '',
            director: payload.director ?? '',
          };
          companyForm.setFieldsValue(fields);
          setLogoPreview(payload.logo ?? null);
          setLogoFile(null);
        } else {
          setCompanyInfoId(null);
          companyForm.resetFields();
          setLogoPreview(null);
          setLogoFile(null);
        }
      } catch (error) {
        console.error(error);
        message.error("Kompaniya ma'lumotlarini yuklashda xatolik yuz berdi");
      } finally {
        setCompanyLoading(false);
      }
    };
    loadCompanyInfo();
  }, [isAdmin, companyForm]);

  useEffect(() => {
    return () => {
      if (logoPreview && logoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);

  const handleTelegramSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await http.post('/api/telegram/link/', { telegram_id: telegramId });
      toast.success('Telegram linked');
      setConnected(true);
    } catch (error) {
      toast.error('Telegram linking failed');
    }
  };

  const handleConfigSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!config) return;
    try {
      const response = await http.put<SystemConfig>('/api/system/config/', config);
      setConfig(response.data);
      toast.success('Configuration updated');
    } catch (error) {
      toast.error('Failed to update config');
    }
  };

  const handleLogoChange = (info: UploadChangeParam<UploadFile>) => {
    const file = info.file.originFileObj;
    if (file) {
      if (logoPreview && logoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreview);
      }
      setLogoFile(file as File);
      setLogoPreview(URL.createObjectURL(file as File));
    }
  };

  const handleCompanySave = async (values: CompanyInfoFormValues) => {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value as string);
      }
    });
    if (logoFile) {
      formData.append('logo', logoFile);
    }
    setSavingCompany(true);
    try {
      const response = companyInfoId
        ? await http.patch<CompanyInfoPayload>(`/api/company-info/${companyInfoId}/`, formData)
        : await http.post<CompanyInfoPayload>('/api/company-info/', formData);
      const payload = response.data;
      setCompanyInfoId(payload.id ?? companyInfoId);
      const nextFields: CompanyInfoFormValues = {
        name: payload.name ?? values.name,
        slogan: payload.slogan ?? values.slogan,
        address: payload.address ?? values.address,
        phone: payload.phone ?? values.phone,
        email: payload.email ?? values.email,
        website: payload.website ?? values.website,
        bank_name: payload.bank_name ?? values.bank_name,
        account_number: payload.account_number ?? values.account_number,
        inn: payload.inn ?? values.inn,
        mfo: payload.mfo ?? values.mfo,
        director: payload.director ?? values.director,
      };
      companyForm.setFieldsValue(nextFields);
      if (payload.logo) {
        setLogoPreview(payload.logo);
      } else if (!logoFile) {
        setLogoPreview(null);
      }
      setLogoFile(null);
      message.success("Kompaniya ma'lumotlari saqlandi!");
    } catch (error) {
      console.error(error);
      message.error("Kompaniya ma'lumotlarini saqlashda xatolik yuz berdi");
    } finally {
      setSavingCompany(false);
    }
  };

  return (
    <section className="page-wrapper space-y-8">
      {isAdmin && (
        <Card
          title="🏢 Kompaniya ma'lumotlari"
          className="max-w-3xl border border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          loading={companyLoading}
        >
          <Form form={companyForm} layout="vertical" onFinish={handleCompanySave}>
            <Form.Item name="name" label="Kompaniya nomi" rules={[{ required: true, message: 'Kompaniya nomi majburiy' }]}>
              <Input placeholder="Masalan: Lenza Group LLC" />
            </Form.Item>
            <Form.Item name="slogan" label="Slogan">
              <Input placeholder="Masalan: Yangi avlod eshiklari" />
            </Form.Item>
            <Form.Item label="Logo">
              <Upload
                name="logo"
                showUploadList={false}
                beforeUpload={() => false}
                accept="image/*"
                onChange={handleLogoChange}
              >
                <AntButton icon={<UploadOutlined />}>Logo yuklash</AntButton>
              </Upload>
              {logoPreview && (
                <div className="mt-3 space-y-2">
                  <img src={logoPreview} alt="Company logo" className="h-16 object-contain" />
                  <div>
                    <AntButton size="small" onClick={() => { setLogoPreview(null); setLogoFile(null); }}>
                      Tozalash
                    </AntButton>
                  </div>
                </div>
              )}
            </Form.Item>
            <Form.Item name="address" label="Manzil">
              <TextArea rows={2} placeholder="Manzilni kiriting" />
            </Form.Item>
            <Form.Item name="phone" label="Telefon">
              <Input placeholder="+998 xx xxx xx xx" />
            </Form.Item>
            <Form.Item name="email" label="Email">
              <Input placeholder="info@example.com" />
            </Form.Item>
            <Form.Item name="website" label="Website">
              <Input placeholder="https://lenza.uz" />
            </Form.Item>
            <Form.Item name="bank_name" label="Bank nomi">
              <Input />
            </Form.Item>
            <Form.Item name="account_number" label="Hisob raqami">
              <Input />
            </Form.Item>
            <Form.Item name="inn" label="INN">
              <Input />
            </Form.Item>
            <Form.Item name="mfo" label="MFO">
              <Input />
            </Form.Item>
            <Form.Item name="director" label="Direktor">
              <Input />
            </Form.Item>
            <AntButton type="primary" icon={<SaveOutlined />} htmlType="submit" loading={savingCompany}>
              Saqlash
            </AntButton>
          </Form>
        </Card>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Telegram</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Link your Telegram account to receive bot notifications.</p>
        <form onSubmit={handleTelegramSubmit} className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Telegram ID</label>
            <input
              value={telegramId}
              onChange={(event) => setTelegramId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              placeholder="123456789"
            />
          </div>
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-white dark:bg-emerald-500 dark:text-slate-900" type="submit">
            {connected ? 'Connected ✅' : 'Connect'}
          </button>
        </form>
      </div>

      {isAdmin && config && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">System Configuration</h2>
          <form onSubmit={handleConfigSubmit} className="mt-4 space-y-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Low stock threshold
              <input
                type="number"
                value={config.LOW_STOCK_THRESHOLD as number}
                onChange={(event) => setConfig({ ...config, LOW_STOCK_THRESHOLD: Number(event.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Backup path
              <input
                type="text"
                value={config.BACKUP_PATH as string}
                onChange={(event) => setConfig({ ...config, BACKUP_PATH: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Default exchange rate
              <input
                type="number"
                value={config.DEFAULT_EXCHANGE_RATE as string}
                onChange={(event) => setConfig({ ...config, DEFAULT_EXCHANGE_RATE: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </label>
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-white dark:bg-emerald-500 dark:text-slate-900" type="submit">
              Save
            </button>
          </form>
        </div>
      )}
    </section>
  );
};

export default SettingsPage;
