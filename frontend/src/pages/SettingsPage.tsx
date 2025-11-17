import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        message.error(t('settings.companyInfo.messages.loadError'));
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
      toast.success(t('settings.telegram.messages.linked'));
      setConnected(true);
    } catch (error) {
      toast.error(t('settings.telegram.messages.linkFailed'));
    }
  };

  const handleConfigSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!config) return;
    try {
      const response = await http.put<SystemConfig>('/api/system/config/', config);
      setConfig(response.data);
      toast.success(t('settings.system.messages.updated'));
    } catch (error) {
      toast.error(t('settings.system.messages.updateFailed'));
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
      message.success(t('settings.companyInfo.messages.saved'));
    } catch (error) {
      console.error(error);
      message.error(t('settings.companyInfo.messages.saveError'));
    } finally {
      setSavingCompany(false);
    }
  };

  return (
    <section className="page-wrapper space-y-8">
      {isAdmin && (
        <Card
          title={`🏢 ${t('settings.companyInfo.title')}`}
          className="max-w-3xl border border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          loading={companyLoading}
        >
          <Form form={companyForm} layout="vertical" onFinish={handleCompanySave}>
            <Form.Item name="name" label={t('settings.companyInfo.form.name')} rules={[{ required: true, message: t('settings.companyInfo.form.nameRequired') }]}>
              <Input placeholder={t('settings.companyInfo.form.namePlaceholder')} />
            </Form.Item>
            <Form.Item name="slogan" label={t('settings.companyInfo.form.slogan')}>
              <Input placeholder={t('settings.companyInfo.form.sloganPlaceholder')} />
            </Form.Item>
            <Form.Item label={t('settings.companyInfo.form.logo')}>
              <Upload
                name="logo"
                showUploadList={false}
                beforeUpload={() => false}
                accept="image/*"
                onChange={handleLogoChange}
              >
                <AntButton icon={<UploadOutlined />}>{t('settings.companyInfo.form.uploadLogo')}</AntButton>
              </Upload>
              {logoPreview && (
                <div className="mt-3 space-y-2">
                  <img src={logoPreview} alt={t('settings.companyInfo.form.logoAlt')} className="h-16 object-contain" />
                  <div>
                    <AntButton size="small" onClick={() => { setLogoPreview(null); setLogoFile(null); }}>
                      {t('actions.clear')}
                    </AntButton>
                  </div>
                </div>
              )}
            </Form.Item>
            <Form.Item name="address" label={t('settings.companyInfo.form.address')}>
              <TextArea rows={2} placeholder={t('settings.companyInfo.form.addressPlaceholder')} />
            </Form.Item>
            <Form.Item name="phone" label={t('settings.companyInfo.form.phone')}>
              <Input placeholder={t('settings.companyInfo.form.phonePlaceholder')} />
            </Form.Item>
            <Form.Item name="email" label={t('settings.companyInfo.form.email')}>
              <Input placeholder={t('settings.companyInfo.form.emailPlaceholder')} />
            </Form.Item>
            <Form.Item name="website" label={t('settings.companyInfo.form.website')}>
              <Input placeholder={t('settings.companyInfo.form.websitePlaceholder')} />
            </Form.Item>
            <Form.Item name="bank_name" label={t('settings.companyInfo.form.bankName')}>
              <Input />
            </Form.Item>
            <Form.Item name="account_number" label={t('settings.companyInfo.form.accountNumber')}>
              <Input />
            </Form.Item>
            <Form.Item name="inn" label={t('settings.companyInfo.form.inn')}>
              <Input />
            </Form.Item>
            <Form.Item name="mfo" label={t('settings.companyInfo.form.mfo')}>
              <Input />
            </Form.Item>
            <Form.Item name="director" label={t('settings.companyInfo.form.director')}>
              <Input />
            </Form.Item>
            <AntButton type="primary" icon={<SaveOutlined />} htmlType="submit" loading={savingCompany}>
              {t('actions.save')}
            </AntButton>
          </Form>
        </Card>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('settings.telegram.title')}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.telegram.description')}</p>
        <form onSubmit={handleTelegramSubmit} className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.telegram.telegramId')}</label>
            <input
              value={telegramId}
              onChange={(event) => setTelegramId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              placeholder={t('settings.telegram.placeholder')}
            />
          </div>
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-white dark:bg-emerald-500 dark:text-slate-900" type="submit">
            {connected ? t('settings.telegram.connected') : t('settings.telegram.connect')}
          </button>
        </form>
      </div>

      {isAdmin && config && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('settings.system.title')}</h2>
          <form onSubmit={handleConfigSubmit} className="mt-4 space-y-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              {t('settings.system.lowStockThreshold')}
              <input
                type="number"
                value={config.LOW_STOCK_THRESHOLD as number}
                onChange={(event) => setConfig({ ...config, LOW_STOCK_THRESHOLD: Number(event.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              {t('settings.system.backupPath')}
              <input
                type="text"
                value={config.BACKUP_PATH as string}
                onChange={(event) => setConfig({ ...config, BACKUP_PATH: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              {t('settings.system.defaultExchangeRate')}
              <input
                type="number"
                value={config.DEFAULT_EXCHANGE_RATE as string}
                onChange={(event) => setConfig({ ...config, DEFAULT_EXCHANGE_RATE: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </label>
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-white dark:bg-emerald-500 dark:text-slate-900" type="submit">
              {t('actions.save')}
            </button>
          </form>
        </div>
      )}
    </section>
  );
};

export default SettingsPage;
