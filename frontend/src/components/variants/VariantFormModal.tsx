import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline';

import Modal from '../Modal';
import {
  createProductVariant,
  updateProductVariant,
  fetchProductModels,
  type ProductVariant,
  type ProductVariantPayload,
  type ProductModel,
} from '../../api/productVariantsApi';

interface VariantFormModalProps {
  variant?: ProductVariant | null;
  onClose: () => void;
  onSuccess: () => void;
}

const DOOR_TYPES = [
  { value: 'ПГ', label: 'ПГ (Полотно глухое)' },
  { value: 'ПО', label: 'ПО (Полотно остеклённое)' },
  { value: 'ПДО', label: 'ПДО (Полотно частично остеклённое)' },
  { value: 'ПДГ', label: 'ПДГ (Полотно с декоративными элементами)' },
];

export default function VariantFormModal({ variant, onClose, onSuccess }: VariantFormModalProps) {
  const { t } = useTranslation();
  const isEditMode = !!variant;

  const [loading, setLoading] = useState(false);
  const [productModels, setProductModels] = useState<ProductModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [modelSearch, setModelSearch] = useState('');

  const [formData, setFormData] = useState<ProductVariantPayload>({
    product_model: variant?.product_model || 0,
    color: variant?.color || '',
    door_type: variant?.door_type || 'ПГ',
    is_active: variant?.is_active ?? true,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(variant?.image || '');

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load product models
  useEffect(() => {
    const loadModels = async () => {
      try {
        setLoadingModels(true);
        const models = await fetchProductModels(modelSearch);
        setProductModels(models);
      } catch (error) {
        console.error('Failed to load product models:', error);
        toast.error('Failed to load product models');
      } finally {
        setLoadingModels(false);
      }
    };

    const timeoutId = setTimeout(loadModels, 300);
    return () => clearTimeout(timeoutId);
  }, [modelSearch]);

  const handleInputChange = (field: keyof ProductVariantPayload, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image size must be less than 10MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.product_model) {
      newErrors.product_model = t('variants.errors.modelRequired');
    }
    if (!formData.color.trim()) {
      newErrors.color = t('variants.errors.colorRequired');
    }
    if (!formData.door_type) {
      newErrors.door_type = t('variants.errors.doorTypeRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error(t('errors.validationFailed'));
      return;
    }

    setLoading(true);

    try {
      const payload: ProductVariantPayload = {
        ...formData,
        image: imageFile || undefined,
      };

      if (isEditMode && variant) {
        await updateProductVariant(variant.id, payload);
        toast.success(t('variants.updated'));
      } else {
        await createProductVariant(payload);
        toast.success(t('variants.created'));
      }

      onSuccess();
    } catch (error: any) {
      console.error('Failed to save variant:', error);
      
      // Handle validation errors from backend
      if (error.response?.data) {
        const backendErrors = error.response.data;
        const errorMessages: Record<string, string> = {};
        
        Object.keys(backendErrors).forEach((key) => {
          if (Array.isArray(backendErrors[key])) {
            errorMessages[key] = backendErrors[key][0];
          } else if (typeof backendErrors[key] === 'string') {
            errorMessages[key] = backendErrors[key];
          }
        });
        
        setErrors(errorMessages);
        toast.error(Object.values(errorMessages)[0] || t('errors.saveFailed'));
      } else {
        toast.error(t('errors.saveFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isEditMode ? t('variants.editVariant') : t('variants.createVariant')}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product Model Select */}
        <div>
          <label htmlFor="product_model" className="block text-sm font-medium text-gray-700">
            {t('variants.productModel')} <span className="text-red-500">*</span>
          </label>
          <div className="mt-1">
            <input
              type="text"
              placeholder={t('variants.searchModel')}
              value={modelSearch}
              onChange={(e) => setModelSearch(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm mb-2"
            />
            <select
              id="product_model"
              value={formData.product_model}
              onChange={(e) => handleInputChange('product_model', Number(e.target.value))}
              className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                errors.product_model ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={loadingModels}
            >
              <option value={0}>{t('variants.selectModel')}</option>
              {productModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.brand_name} - {model.collection} - {model.model_name}
                </option>
              ))}
            </select>
            {errors.product_model && (
              <p className="mt-1 text-sm text-red-600">{errors.product_model}</p>
            )}
          </div>
        </div>

        {/* Color */}
        <div>
          <label htmlFor="color" className="block text-sm font-medium text-gray-700">
            {t('variants.color')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="color"
            value={formData.color}
            onChange={(e) => handleInputChange('color', e.target.value)}
            placeholder={t('variants.colorPlaceholder')}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
              errors.color ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.color && <p className="mt-1 text-sm text-red-600">{errors.color}</p>}
        </div>

        {/* Door Type */}
        <div>
          <label htmlFor="door_type" className="block text-sm font-medium text-gray-700">
            {t('variants.doorType')} <span className="text-red-500">*</span>
          </label>
          <select
            id="door_type"
            value={formData.door_type}
            onChange={(e) => handleInputChange('door_type', e.target.value)}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
              errors.door_type ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            {DOOR_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          {errors.door_type && <p className="mt-1 text-sm text-red-600">{errors.door_type}</p>}
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('variants.image')}
          </label>
          <div className="mt-1 flex items-center space-x-4">
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-32 w-32 object-contain rounded-lg border border-gray-300"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="h-32 w-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                <PhotoIcon className="h-12 w-12 text-gray-400" />
              </div>
            )}
            <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="sr-only"
              />
              {t('variants.chooseImage')}
            </label>
          </div>
          <p className="mt-2 text-sm text-gray-500">{t('variants.imageHint')}</p>
        </div>

        {/* Status */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_active"
            checked={formData.is_active}
            onChange={(e) => handleInputChange('is_active', e.target.checked)}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
            {t('variants.active')}
          </label>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                {t('common.saving')}...
              </>
            ) : (
              t('common.save')
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
