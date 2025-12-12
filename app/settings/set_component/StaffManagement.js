// app/settings/set_component/StaffManagement.js
"use client";
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Check, User } from 'lucide-react';

const StaffManagement = () => {
  const [staff, setStaff] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // フォームデータ
  const [formData, setFormData] = useState({
    name: '',
    color: '#FF69B4',
    role: 'セラピスト',
    is_active: true,
    hourly_wage: 1500,
    transport_allowance: 900
  });

  // カラーパレット
  const colorOptions = [
    '#FF69B4', // ピンク
    '#9370DB', // 紫
    '#4169E1', // 青
    '#32CD32', // 緑
    '#FFD700', // 金
    '#FF6347', // トマト
    '#00CED1', // ダークターコイズ
    '#FF8C00', // ダークオレンジ
  ];

  // 初期データ読み込み
  useEffect(() => {
    fetchStaff();
  }, []);

  // スタッフ一覧取得
  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/staff');
      if (response.ok) {
        const data = await response.json();
        setStaff(data.data || []);
      } else {
        throw new Error('API not available');
      }
    } catch (err) {
      console.error('スタッフデータの取得に失敗:', err);
      setStaff([
        { staff_id: '1', name: '佐野 智里', color: '#FF69B4', role: 'セラピスト', is_active: true, hourly_wage: 1500, transport_allowance: 900 },
        { staff_id: '2', name: '星野 加奈恵', color: '#9370DB', role: 'セラピスト', is_active: true, hourly_wage: 1500, transport_allowance: 900 },
        { staff_id: '3', name: '吉羽 顕功', color: '#4169E1', role: 'マネージャー', is_active: true, hourly_wage: 1500, transport_allowance: 900 },
        { staff_id: '4', name: '吉羽 皓紀', color: '#32CD32', role: 'セラピスト', is_active: false, hourly_wage: 1500, transport_allowance: 900 },
      ]);
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

  // 新規追加
  const handleAdd = async () => {
    if (!formData.name.trim()) {
      setError('スタッフ名を入力してください');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess('スタッフを登録しました');
        fetchStaff();
        setShowAddForm(false);
        resetForm();
      } else {
        throw new Error('登録に失敗しました');
      }
    } catch (err) {
      const newStaff = {
        staff_id: Date.now().toString(),
        ...formData
      };
      setStaff(prev => [...prev, newStaff]);
      setSuccess('スタッフを登録しました（ローカル保存）');
      setShowAddForm(false);
      resetForm();
    } finally {
      setIsLoading(false);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  // 編集開始
  const startEdit = (staffMember) => {
    setEditingId(staffMember.staff_id);
    setFormData({
      name: staffMember.name,
      color: staffMember.color,
      role: staffMember.role,
      is_active: staffMember.is_active,
      hourly_wage: staffMember.hourly_wage || 1500,
      transport_allowance: staffMember.transport_allowance || 900
    });
  };

  // 編集保存
  const handleUpdate = async (staffId) => {
    if (!formData.name.trim()) {
      setError('スタッフ名を入力してください');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/staff`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: staffId,
          ...formData
        })
      });

      if (response.ok) {
        setSuccess('更新しました');
        fetchStaff();
        setEditingId(null);
      } else {
        throw new Error('更新に失敗しました');
      }
    } catch (err) {
      setStaff(prev => prev.map(s =>
        s.staff_id === staffId ? { ...s, ...formData } : s
      ));
      setSuccess('更新しました（ローカル保存）');
      setEditingId(null);
    } finally {
      setIsLoading(false);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  // 削除
  const handleDelete = async (staffId) => {
    if (!confirm('このスタッフを削除しますか？')) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/staff?staff_id=${staffId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSuccess('削除しました');
        fetchStaff();
      } else {
        throw new Error('削除に失敗しました');
      }
    } catch (err) {
      setStaff(prev => prev.filter(s => s.staff_id !== staffId));
      setSuccess('削除しました（ローカル保存）');
    } finally {
      setIsLoading(false);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  // キャンセル
  const handleCancel = () => {
    setEditingId(null);
    setShowAddForm(false);
    resetForm();
  };

  // フォームリセット
  const resetForm = () => {
    setFormData({
      name: '',
      color: '#FF69B4',
      role: 'セラピスト',
      is_active: true,
      hourly_wage: 1500,
      transport_allowance: 900
    });
  };

  return (
    <div className="settings__staff-management">
      {/* アラート */}
      {error && (
        <div className="settings__alert settings__alert--error">
          {error}
        </div>
      )}
      {success && (
        <div className="settings__alert settings__alert--success">
          {success}
        </div>
      )}

      {/* セクションヘッダー */}
      <div className="settings__section-header">
        <h3 className="settings__section-title">スタッフ一覧</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="settings__btn settings__btn--primary"
          disabled={showAddForm || isLoading}
        >
          <Plus size={16} />
          新規追加
        </button>
      </div>

      {/* 追加フォーム */}
      {showAddForm && (
        <div className="settings__add-form">
          <div className="settings__form-grid">
            <div className="settings__form-group">
              <label className="settings__form-label">スタッフ名</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="settings__form-input"
                placeholder="例: 山田 花子"
              />
            </div>

            <div className="settings__form-group">
              <label className="settings__form-label">役職</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="settings__form-select"
              >
                <option value="セラピスト">セラピスト</option>
                <option value="マネージャー">マネージャー</option>
                <option value="研修生">研修生</option>
                <option value="受付">受付</option>
              </select>
            </div>

            <div className="settings__form-group">
              <label className="settings__form-label">時給（円）</label>
              <input
                type="number"
                name="hourly_wage"
                value={formData.hourly_wage}
                onChange={handleInputChange}
                className="settings__form-input"
                placeholder="1500"
              />
            </div>

            <div className="settings__form-group">
              <label className="settings__form-label">交通費（円）</label>
              <input
                type="number"
                name="transport_allowance"
                value={formData.transport_allowance}
                onChange={handleInputChange}
                className="settings__form-input"
                placeholder="900"
              />
            </div>

            <div className="settings__form-group">
              <label className="settings__form-label">カラー</label>
              <div className="settings__color-picker">
                {colorOptions.map(color => (
                  <button
                    key={color}
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                    className={`settings__color-option ${formData.color === color ? 'settings__color-option--selected' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="settings__form-group">
              <label className="settings__form-label settings__form-label--checkbox">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  className="settings__form-checkbox"
                />
                有効
              </label>
            </div>
          </div>

          <div className="settings__form-actions">
            <button
              onClick={handleCancel}
              className="settings__btn settings__btn--secondary"
              disabled={isLoading}
            >
              <X size={16} />
              キャンセル
            </button>
            <button
              onClick={handleAdd}
              className="settings__btn settings__btn--primary"
              disabled={isLoading}
            >
              <Save size={16} />
              登録
            </button>
          </div>
        </div>
      )}

      {/* スタッフテーブル */}
      <div className="settings__table-container">
        <table className="settings__table">
          <thead>
            <tr>
              <th>カラー</th>
              <th>スタッフ名</th>
              <th>役職</th>
              <th>時給</th>
              <th>交通費</th>
              <th>ステータス</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {staff.map(member => (
              <tr key={member.staff_id}>
                {editingId === member.staff_id ? (
                  <>
                    <td>
                      <div className="settings__color-picker settings__color-picker--inline">
                        {colorOptions.map(color => (
                          <button
                            key={color}
                            onClick={() => setFormData(prev => ({ ...prev, color }))}
                            className={`settings__color-option settings__color-option--small ${formData.color === color ? 'settings__color-option--selected' : ''}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </td>
                    <td>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="settings__form-input settings__form-input--inline"
                      />
                    </td>
                    <td>
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleInputChange}
                        className="settings__form-select settings__form-select--inline"
                      >
                        <option value="セラピスト">セラピスト</option>
                        <option value="マネージャー">マネージャー</option>
                        <option value="研修生">研修生</option>
                        <option value="受付">受付</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        name="hourly_wage"
                        value={formData.hourly_wage}
                        onChange={handleInputChange}
                        className="settings__form-input settings__form-input--inline"
                        placeholder="1500"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        name="transport_allowance"
                        value={formData.transport_allowance}
                        onChange={handleInputChange}
                        className="settings__form-input settings__form-input--inline"
                        placeholder="900"
                      />
                    </td>
                    <td>
                      <label className="settings__form-label--checkbox">
                        <input
                          type="checkbox"
                          name="is_active"
                          checked={formData.is_active}
                          onChange={handleInputChange}
                          className="settings__form-checkbox"
                        />
                        有効
                      </label>
                    </td>
                    <td>
                      <div className="settings__actions">
                        <button
                          onClick={() => handleUpdate(member.staff_id)}
                          className="settings__btn-icon settings__btn-icon--success"
                          disabled={isLoading}
                        >
                          <Save size={16} />
                        </button>
                        <button
                          onClick={handleCancel}
                          className="settings__btn-icon settings__btn-icon--secondary"
                          disabled={isLoading}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td>
                      <div
                        className="settings__color-indicator"
                        style={{ backgroundColor: member.color }}
                      />
                    </td>
                    <td>
                      <div className="settings__table-name">
                        <User size={16} />
                        {member.name}
                      </div>
                    </td>
                    <td>{member.role}</td>
                    <td>¥{(member.hourly_wage || 1500).toLocaleString()}</td>
                    <td>¥{(member.transport_allowance || 900).toLocaleString()}</td>
                    <td>
                      <span className={`settings__status-badge ${member.is_active ? 'settings__status-badge--active' : 'settings__status-badge--inactive'}`}>
                        {member.is_active ? '有効' : '無効'}
                      </span>
                    </td>
                    <td>
                      <div className="settings__actions">
                        <button
                          onClick={() => startEdit(member)}
                          className="settings__btn-icon settings__btn-icon--primary"
                          disabled={isLoading}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(member.staff_id)}
                          className="settings__btn-icon settings__btn-icon--danger"
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

        {staff.length === 0 && !isLoading && (
          <div className="settings__empty-state">
            <User size={48} />
            <p>スタッフが登録されていません</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="settings__btn settings__btn--primary"
            >
              <Plus size={16} />
              最初のスタッフを追加
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffManagement;