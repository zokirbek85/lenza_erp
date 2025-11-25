import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload } from 'antd';
import { UploadOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import MobileDrawerForm from '../../components/responsive/MobileDrawerForm';
import MobileFormField from '../../components/responsive/MobileFormField';

type ProductFormData = {
  sku: string;
  name: string;
  brand_id: number | '';
  category_id: number | '';
  sell_price_usd: string;
  stock_ok: string;
  stock_defect: string;
};

type MobileProductFormProps = {
  open: boolean;
  onClose: () => void;
  form: ProductFormData;
  brands: Array<{ id: number; name: string }>;
  categories: Array<{ id: number; name: string }>;
  editingId: number | null;
  imagePreview: string | null;
  imageFile: File | null;
  imageUploading: boolean;
  onFormChange: (field: keyof ProductFormData, value: string | number) => void;
  onImageChange: (file: File | null) => void;
  onImageRemove: () => void;
  onSubmit: () => void;
  submitting: boolean;
};

/**
 * MobileProductForm - Full-screen product creation/edit form for mobile devices
 * 
 * Features:
 * - Image upload with preview
 * - SKU, name, brand, category fields
 * - Price and stock management
 * - Validation feedback
 * - Fixed bottom action bar
 * - Dark mode support
 */
const MobileProductForm = ({
  open,
  onClose,
  form,
  brands,
  categories,
  editingId,
  imagePreview,
  imageFile, // Used for form state tracking
  imageUploading,
  onFormChange,
  onImageChange,
  onImageRemove,
  onSubmit,
  submitting,
}: MobileProductFormProps) => {
  const { t } = useTranslation();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  
  // Track imageFile in fileList for UI consistency
  if (imageFile && fileList.length === 0) {
    setFileList([{
      uid: '-1',
      name: imageFile.name,
      status: 'done',
    } as UploadFile]);
  }

  const handleUploadChange = (info: any) => {
    let newFileList = [...info.fileList];
    newFileList = newFileList.slice(-1); // Keep only last file

    setFileList(newFileList);

    if (info.file.status === 'done' || info.file.originFileObj) {
      onImageChange(info.file.originFileObj);
    }
  };

  const handleRemoveImage = () => {
    setFileList([]);
    onImageRemove();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const footer = (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onClose}
        disabled={submitting || imageUploading}
        className="mobile-btn flex-1 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
      >
        {t('common:actions.cancel')}
      </button>
      <button
        type="submit"
        onClick={handleSubmit}
        disabled={submitting || imageUploading}
        className="mobile-btn flex-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500"
      >
        {submitting ? t('common:actions.saving') : editingId ? t('common:actions.update') : t('common:actions.create')}
      </button>
    </div>
  );

  return (
    <MobileDrawerForm
      open={open}
      onClose={onClose}
      title={editingId ? t('products.form.editProduct') : t('products.form.createProduct')}
      footer={footer}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product Image */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t('products.form.productImage')}
          </h3>

          {(imagePreview || fileList.length > 0) ? (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                <img
                  src={imagePreview || (fileList[0]?.originFileObj ? URL.createObjectURL(fileList[0].originFileObj) : '')}
                  alt="Product preview"
                  className="h-48 w-full object-cover"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (imagePreview) {
                      window.open(imagePreview, '_blank');
                    } else if (fileList[0]?.originFileObj) {
                      const url = URL.createObjectURL(fileList[0].originFileObj);
                      window.open(url, '_blank');
                    }
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <EyeOutlined />
                  {t('common:actions.preview')}
                </button>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  disabled={imageUploading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                >
                  <DeleteOutlined />
                  {t('common:actions.remove')}
                </button>
              </div>
            </div>
          ) : (
            <Upload
              fileList={fileList}
              onChange={handleUploadChange}
              beforeUpload={() => false}
              accept="image/*"
              maxCount={1}
              listType="picture-card"
              className="w-full"
            >
              <div className="flex flex-col items-center justify-center p-8">
                <UploadOutlined className="text-3xl text-slate-400" />
                <span className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {t('products.form.uploadImage')}
                </span>
              </div>
            </Upload>
          )}
        </div>

        {/* Basic Info Section */}
        <div className="space-y-4 rounded-lg bg-white p-4 shadow-sm dark:bg-slate-900">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t('products.form.basicInfo')}
          </h3>

          <MobileFormField label={t('products.form.sku')} required>
            <input
              type="text"
              required
              value={form.sku}
              onChange={(e) => onFormChange('sku', e.target.value)}
              placeholder={t('products.form.skuPlaceholder')}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              style={{ minHeight: '44px', fontSize: '16px' }}
            />
          </MobileFormField>

          <MobileFormField label={t('products.form.name')} required>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => onFormChange('name', e.target.value)}
              placeholder={t('products.form.namePlaceholder')}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              style={{ minHeight: '44px', fontSize: '16px' }}
            />
          </MobileFormField>

          <MobileFormField label={t('products.form.brand')} required>
            <select
              required
              value={form.brand_id}
              onChange={(e) => onFormChange('brand_id', Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              style={{ minHeight: '44px', fontSize: '16px' }}
            >
              <option value="">{t('products.form.selectBrand')}</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </MobileFormField>

          <MobileFormField label={t('products.form.category')} required>
            <select
              required
              value={form.category_id}
              onChange={(e) => onFormChange('category_id', Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              style={{ minHeight: '44px', fontSize: '16px' }}
            >
              <option value="">{t('products.form.selectCategory')}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </MobileFormField>
        </div>

        {/* Pricing Section */}
        <div className="space-y-4 rounded-lg bg-white p-4 shadow-sm dark:bg-slate-900">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t('products.form.pricing')}
          </h3>

          <MobileFormField label={t('products.form.sellPrice')} required>
            <div className="relative">
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={form.sell_price_usd}
                onChange={(e) => onFormChange('sell_price_usd', e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 pr-16 text-base dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                style={{ minHeight: '44px', fontSize: '16px' }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                USD
              </span>
            </div>
          </MobileFormField>
        </div>

        {/* Stock Section */}
        <div className="space-y-4 rounded-lg bg-white p-4 shadow-sm dark:bg-slate-900">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t('products.form.stock')}
          </h3>

          <MobileFormField label={t('products.form.stockOk')}>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.stock_ok}
              onChange={(e) => onFormChange('stock_ok', e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              style={{ minHeight: '44px', fontSize: '16px' }}
            />
          </MobileFormField>

          <MobileFormField label={t('products.form.stockDefect')}>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.stock_defect}
              onChange={(e) => onFormChange('stock_defect', e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              style={{ minHeight: '44px', fontSize: '16px' }}
            />
          </MobileFormField>
        </div>

        {/* Bottom spacing for fixed footer */}
        <div style={{ height: '80px' }} />
      </form>
    </MobileDrawerForm>
  );
};

export default MobileProductForm;
