// app/settings/set_component/OptionsManagement.js
"use client";
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Check, Settings2, Clock, Circle } from 'lucide-react';
import './OptionsManagement.css';

const OptionsManagement = () => {
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // フォームデータ
  const [formData, setFormData] = useState({
    name: '',
    category: 'フェイシャル',
    duration_minutes: 0,
    price: '',
    description: '',
    is_active: true
  });

  // カテゴリ選択
  const categories = ['フェイシャル', 'ボディ', 'その他'];

  // カテゴリ別にオプションをグループ化
  const groupedOptions = categories.map(category => ({
    category,
    options: options.filter(opt => opt.category === category)
  })).filter(group => group.options.length > 0);

  // 実際のメニューに基づくオプションテンプレート
  const optionTemplates = [
    // フェイシャルメニュー
    { name: '石膏パック【リフトアップ・保湿・美白】', duration: 20, price: 2000, category: 'フェイシャル' },
    { name: '炭酸パック【抗酸化・抗炎症・保湿】', duration: 15, price: 1500, category: 'フェイシャル' },
    { name: 'MFIP機器【エイジング・くすみ・むくみ】', duration: 15, price: 2000, category: 'フェイシャル' },
    { name: 'ラジオ波フェイス【新陳代謝UP・脂肪燃焼】', duration: 15, price: 2000, category: 'フェイシャル' },

    // ボディメニュー
    { name: 'ドライヘッド【眼精疲労・自律神経・脳疲労】', duration: 20, price: 2000, category: 'ボディ' },
    { name: 'ネックセラピー【スマホ首・首こり・血行促進】', duration: 15, price: 1500, category: 'ボディ' },
    { name: '肩甲骨リフレ【姿勢改善・肩こり・可動域UP】', duration: 20, price: 2000, category: 'ボディ' },
    { name: '背中コルギ【背中疲労・腰痛・肩こり】', duration: 20, price: 2500, category: 'ボディ' },
    { name: '美脚リンパ【浮腫・セルライト・疲労回復】', duration: 30, price: 3000, category: 'ボディ' },
    { name: 'カッピング【背中疲労・冷え・むくみ】', duration: 20, price: 2500, category: 'ボディ' },
    { name: '足つぼ【内臓機能・冷え性・むくみ】', duration: 20, price: 2000, category: 'ボディ' }
  ];

  // 初期データ読み込み
  useEffect(() => {
    fetchOptions();
  }, []);

  // オプション一覧取得
  const fetchOptions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/options?all=true');
      if (response.ok) {
        const data = await response.json();
        setOptions(data.data || []);
      } else {
        throw new Error('API not available');
      }
    } catch (err) {
      console.error('オプション取得エラー:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // フォーム入力処理
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // テンプレート適用
  const applyTemplate = (template) => {
    setFormData({
      name: template.name,
      category: template.category || 'その他',
      duration_minutes: template.duration,
      price: template.price,
      description: '',
      is_active: true
    });
  };

  // 新規追加
  const handleAdd = async () => {
    if (!formData.name.trim() || !formData.price) {
      setError('オプション名と料金は必須です');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: Number(formData.price),
          duration_minutes: Number(formData.duration_minutes) || 0
        })
      });

      if (response.ok) {
        setSuccess('オプションを登録しました');
        fetchOptions();
        setShowAddForm(false);
        resetForm();
      } else {
        const data = await response.json();
        throw new Error(data.error || '登録に失敗しました');
      }
    } catch (err) {
      // デモモード
      const newOption = {
        option_id: Date.now().toString(),
        ...formData,
        price: Number(formData.price),
        duration_minutes: Number(formData.duration_minutes) || 0
      };
      setOptions(prev => [...prev, newOption]);
      setSuccess('オプションを登録しました(ローカル保存)');
      setShowAddForm(false);
      resetForm();
    } finally {
      setIsLoading(false);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  // 編集開始
  const startEdit = (option) => {
    setEditingId(option.option_id);
    setFormData({
      name: option.name,
      category: option.category || 'その他',
      duration_minutes: option.duration_minutes || 0,
      price: option.price,
      is_active: option.is_active
    });
  };

  // 更新
  const handleUpdate = async (optionId) => {
    if (!formData.name.trim() || !formData.price) {
      setError('オプション名と料金は必須です');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/options', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          option_id: optionId,
          ...formData,
          price: Number(formData.price),
          duration_minutes: Number(formData.duration_minutes) || 0
        })
      });

      if (response.ok) {
        setSuccess('更新しました');
        fetchOptions();
        setEditingId(null);
      } else {
        throw new Error('更新に失敗しました');
      }
    } catch (err) {
      // デモモード
      setOptions(prev => prev.map(opt =>
        opt.option_id === optionId
          ? {
            ...opt,
            ...formData,
            price: Number(formData.price),
            duration_minutes: Number(formData.duration_minutes) || 0
          }
          : opt
      ));
      setSuccess('更新しました(ローカル保存)');
      setEditingId(null);
    } finally {
      setIsLoading(false);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  // 削除
  const handleDelete = async (optionId) => {
    if (!window.confirm('このオプションを削除してもよろしいですか?')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/options?id=${optionId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(data.message);
        fetchOptions();
      } else {
        throw new Error('削除に失敗しました');
      }
    } catch (err) {
      // デモモード
      setOptions(prev => prev.filter(opt => opt.option_id !== optionId));
      setSuccess('削除しました(ローカル保存)');
    } finally {
      setIsLoading(false);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  // フォームリセット
  const resetForm = () => {
    setFormData({
      name: '',
      category: 'フェイシャル',
      duration_minutes: 0,
      price: '',
      description: '',
      is_active: true
    });
  };

  // キャンセル
  const handleCancel = () => {
    setEditingId(null);
    setShowAddForm(false);
    resetForm();
    setError('');
  };

  // 時間フォーマット
  const formatDuration = (minutes) => {
    if (!minutes || minutes === 0) return '-';
    if (minutes < 60) return `${minutes}分`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}時間${mins}分` : `${hours}時間`;
  };

  return (
    <div className="options-management">
      {/* アラート表示 */}
      {error && (
        <div className="options-alert options-alert--error">
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="options-alert options-alert--success">
          <Check size={16} />
          <span>{success}</span>
        </div>
      )}

      {/* ヘッダー */}
      <div className="options-header">
        <div className="options-header-title">
          <Settings2 className="options-icon" />
          <h3 className="options-title">オプション一覧</h3>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="options-btn options-btn--primary"
            disabled={isLoading}
          >
            <Plus size={16} />
            新規オプション追加
          </button>
        )}
      </div>

      {/* 新規追加フォーム */}
      {showAddForm && (
        <div className="options-form-card">
          <h4>新規オプション登録</h4>

          {/* テンプレート選択 */}
          <div className="options-templates">
            <span className="options-template-label">よく使うメニューから選択</span>

            {/* フェイシャルメニュー */}
            <div className="options-template-section">
              <h5>フェイシャルメニュー</h5>
              <div className="options-template-buttons">
                {optionTemplates.filter(t => t.category === 'フェイシャル').map((template, index) => (
                  <button
                    key={index}
                    onClick={() => applyTemplate(template)}
                    className="options-template-btn"
                    title={template.name}
                  >
                    {template.name.split('【')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* ボディメニュー */}
            <div className="options-template-section">
              <h5>ボディメニュー</h5>
              <div className="options-template-buttons">
                {optionTemplates.filter(t => t.category === 'ボディ').map((template, index) => (
                  <button
                    key={index}
                    onClick={() => applyTemplate(template)}
                    className="options-template-btn"
                    title={template.name}
                  >
                    {template.name.split('【')[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="options-form-grid">
            <div className="options-form-group options-form-group--wide">
              <label>オプション名 *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="例: 石膏パック【リフトアップ・保湿・美白】"
              />
            </div>

            <div className="options-form-group">
              <label>カテゴリ</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="options-form-group">
              <label>追加時間(分)</label>
              <select
                name="duration_minutes"
                value={formData.duration_minutes}
                onChange={handleInputChange}
              >
                <option value="0">なし</option>
                <option value="10">10分</option>
                <option value="15">15分</option>
                <option value="20">20分</option>
                <option value="30">30分</option>
                <option value="45">45分</option>
                <option value="60">60分</option>
              </select>
            </div>

            <div className="options-form-group">
              <label>追加料金(円) *</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                placeholder="2000"
                step="100"
              />
            </div>

            <div className="options-form-group options-form-group--wide">
              <label>説明・効果</label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="例: リフトアップ・保湿・美白"
              />
            </div>

            <div className="options-form-group">
              <label className="options-checkbox-label">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                />
                有効
              </label>
            </div>
          </div>

          <div className="options-form-actions">
            <button
              onClick={handleCancel}
              className="options-btn options-btn--secondary"
              disabled={isLoading}
            >
              <X size={16} />
              キャンセル
            </button>
            <button
              onClick={handleAdd}
              className="options-btn options-btn--primary"
              disabled={isLoading}
            >
              <Save size={16} />
              登録
            </button>
          </div>
        </div>
      )}

      {/* オプション一覧テーブル */}
      <div className="options-table">
        {groupedOptions.length === 0 && !isLoading ? (
          <div className="options-empty-state">
            <Settings2 size={48} />
            <p>オプションが登録されていません</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="options-btn options-btn--primary"
            >
              <Plus size={16} />
              最初のオプションを追加
            </button>
          </div>
        ) : (
          groupedOptions.map(group => (
            <div key={group.category} className="options-category-section">
              <h4 className="options-category-title">
                <span size={12} className="options-category-icon" />
                {group.category}
              </h4>
              <table>
                <thead>
                  <tr>
                    <th>オプション名</th>
                    <th>追加時間</th>
                    <th>追加料金</th>
                    <th>ステータス</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {group.options.map(option => (
                    <tr key={option.option_id}>
                      {editingId === option.option_id ? (
                        <>
                          <td>
                            <input
                              type="text"
                              name="name"
                              value={formData.name}
                              onChange={handleInputChange}
                              className="options-input-inline"
                            />
                          </td>
                          <td>
                            <select
                              name="duration_minutes"
                              value={formData.duration_minutes}
                              onChange={handleInputChange}
                              className="options-select-inline"
                            >
                              <option value="0">なし</option>
                              <option value="10">10分</option>
                              <option value="15">15分</option>
                              <option value="20">20分</option>
                              <option value="30">30分</option>
                              <option value="50">50分</option>
                              <option value="60">60分</option>
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              name="price"
                              value={formData.price}
                              onChange={handleInputChange}
                              className="options-input-inline options-input-inline--small"
                              step="100"
                            />
                          </td>
                          <td>
                            <label className="options-checkbox-label-inline">
                              <input
                                type="checkbox"
                                name="is_active"
                                checked={formData.is_active}
                                onChange={handleInputChange}
                              />
                              有効
                            </label>
                          </td>
                          <td>
                            <div className="options-actions">
                              <button
                                onClick={() => handleUpdate(option.option_id)}
                                className="options-btn-icon options-btn-icon--success"
                                disabled={isLoading}
                              >
                                <Save size={16} />
                              </button>
                              <button
                                onClick={handleCancel}
                                className="options-btn-icon options-btn-icon--secondary"
                                disabled={isLoading}
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="options-table-name">
                            <Settings2 size={14} className="options-icon-inline" />
                            {option.name}
                          </td>
                          <td>
                            {option.duration_minutes > 0 && (
                              <span className="options-duration">
                                <Clock size={14} className="options-icon-inline" />
                                {formatDuration(option.duration_minutes)}
                              </span>
                            )}
                            {(!option.duration_minutes || option.duration_minutes === 0) && (
                              <span className="options-text-muted">-</span>
                            )}
                          </td>
                          <td>
                            <span className="options-price">
                              <span size={14} className="options-icon-inline" />
                              ¥{option.price.toLocaleString()}
                            </span>
                          </td>
                          <td>
                            <span className={`options-status-badge ${option.is_active ? 'options-status-badge--active' : 'options-status-badge--inactive'}`}>
                              {option.is_active ? '有効' : '無効'}
                            </span>
                          </td>
                          <td>
                            <div className="options-actions">
                              <button
                                onClick={() => startEdit(option)}
                                className="options-btn-icon options-btn-icon--primary"
                                disabled={isLoading}
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(option.option_id)}
                                className="options-btn-icon options-btn-icon--danger"
                                disabled={isLoading}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default OptionsManagement;