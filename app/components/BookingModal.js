import React, { useState, useEffect } from 'react';
import { X, Search, Calendar, Clock, User, Phone, Mail, AlertCircle, Tag, Package, Timer, Settings2, CalendarPlus, CalendarCheck, Ban, AlertTriangle, CreditCard, Check } from 'lucide-react';
import './BookingModal.css';
import DateScrollPicker from './DateScrollPicker';
import TimeScrollPicker from './TimeScrollPicker';

const BookingModal = ({ activeModal, selectedSlot, onClose, onModalChange }) => {
  const isEditMode = selectedSlot?.isEdit || false;
  const isCompletedMode = selectedSlot?.isCompleted || false;  // 施術完了モード
  const bookingId = selectedSlot?.bookingId || null;

  const [formData, setFormData] = useState({
    bookingType: 'booking',
    date: selectedSlot?.date || new Date().toISOString().split('T')[0],
    startTime: selectedSlot?.timeSlot || new Date().toTimeString().slice(0, 5),
    endTime: '',
    staffId: selectedSlot?.staffId || '',
    bedId: '1',
    customerId: '',
    visitCount: 0,
    lastName: '',
    firstName: '',
    lastNameKana: '',
    firstNameKana: '',
    phoneNumber: '',
    email: '',
    birthDate: '',
    gender: 'not_specified',
    serviceId: '',
    serviceType: 'normal',
    optionIds: [],
    ticketIds: [],
    couponId: '',
    limitedOfferIds: [],
    notes: '',
    scheduleTitle: ''
  });

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelType, setCancelType] = useState('');
  const [services, setServices] = useState([]);
  const [options, setOptions] = useState([]);
  const [staff, setStaff] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [ticketPlans, setTicketPlans] = useState([]);
  const [limitedOffers, setLimitedOffers] = useState([]);
  const [customerTickets, setCustomerTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [customerLimitedPurchases, setCustomerLimitedPurchases] = useState([]);
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // 支払い情報（施術完了モード用）
  const [paymentInfo, setPaymentInfo] = useState(null);

  const getGenderLabel = (gender) => {
    const labels = {
      'male': '男性',
      'female': '女性',
      'other': 'その他',
      'not_specified': '未設定'
    };
    return labels[gender] || '未設定';
  };

  useEffect(() => {
    if (activeModal === 'booking') {
      fetchMasterData();
      if (isCompletedMode && selectedSlot?.bookingData) {
        // 施術完了モード: 予約データと支払い情報を取得
        loadBookingData(selectedSlot.bookingData);
        fetchPaymentInfo(selectedSlot.bookingId);
      } else if (isEditMode && selectedSlot?.bookingData) {
        loadBookingData(selectedSlot.bookingData);
      }
    }
  }, [activeModal, isEditMode, isCompletedMode]);

  // 支払い情報を取得
  const fetchPaymentInfo = async (bookingId) => {
    try {
      const response = await fetch(`/api/payments?booking_id=${bookingId}`);
      const data = await response.json();
      if (data.success && data.data && data.data.length > 0) {
        setPaymentInfo(data.data[0]);
      }
    } catch (err) {
      console.error('支払い情報取得エラー:', err);
    }
  };

  const loadBookingData = async (booking) => {
    setIsLoading(true);
    try {
      // 期間限定の購入IDを取得（予約データに含まれている場合）
      const limitedPurchaseIds = booking.limited_purchases?.map(lp => `purchased_${lp.purchase_id}`) || [];
      
      const baseFormData = {
        bookingType: booking.type || 'booking',
        date: booking.date?.split('T')[0] || '',
        startTime: booking.start_time || '',
        endTime: booking.end_time || '',
        staffId: booking.staff_id || '',
        bedId: booking.bed_id?.toString() || '1',
        customerId: booking.customer_id || '',
        visitCount: 0,
        lastName: booking.last_name || '',
        firstName: booking.first_name || '',
        lastNameKana: '',
        firstNameKana: '',
        phoneNumber: '',
        email: '',
        birthDate: '',
        gender: 'not_specified',
        serviceId: booking.service_id || '',
        serviceType: booking.coupon_id ? 'coupon' :
          (booking.tickets?.length > 0) ? 'ticket' :
            (booking.limited_purchases?.length > 0 || booking.limited_offers?.length > 0) ? 'limited' : 'normal',
        optionIds: booking.options?.map(o => o.option_id) || [],
        ticketIds: booking.tickets?.map(t => t.customer_ticket_id) || [],
        couponId: booking.coupon_id || '',
        limitedOfferIds: limitedPurchaseIds,
        notes: booking.notes || '',
        scheduleTitle: booking.notes || ''
      };

      setFormData(baseFormData);

      if (booking.customer_id) {
        try {
          const customerResponse = await fetch(`/api/customers/${booking.customer_id}`);
          const customerData = await customerResponse.json();

          if (customerData.success && customerData.data) {
            const customer = customerData.data;
            setFormData(prev => ({
              ...prev,
              visitCount: customer.visit_count || 0,
              lastNameKana: customer.last_name_kana || '',
              firstNameKana: customer.first_name_kana || '',
              phoneNumber: customer.phone_number || '',
              email: customer.email || '',
              birthDate: customer.birth_date || '',
              gender: customer.gender || 'not_specified'
            }));

            // tickets APIで通常回数券と期間限定回数券の両方を取得
            const ticketsResponse = await fetch(`/api/customers/${booking.customer_id}/tickets`);
            const ticketsData = await ticketsResponse.json();
            if (ticketsData.success) {
              const allTickets = ticketsData.data || [];
              // 通常回数券
              const regularTickets = allTickets.filter(ticket => !ticket.is_limited);
              setCustomerTickets(regularTickets);
              // 期間限定回数券
              const limitedTickets = allTickets.filter(ticket => ticket.is_limited);
              setCustomerLimitedPurchases(limitedTickets);
            }
          }
        } catch (customerErr) {
          console.error('顧客情報取得エラー:', customerErr);
        }
      }
    } catch (err) {
      console.error('予約データ読み込みエラー:', err);
      setError('予約情報の読み込みに失敗しました');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMasterData = async () => {
    setIsLoading(true);
    try {
      const [servicesRes, optionsRes, staffRes, couponsRes, ticketsRes, limitedRes] = await Promise.all([
        fetch('/api/services'),
        fetch('/api/options'),
        fetch('/api/staff'),
        fetch('/api/coupons'),
        fetch('/api/ticket-plans'),
        fetch('/api/limited-offers')
      ]);

      const servicesData = await servicesRes.json();
      const optionsData = await optionsRes.json();
      const staffData = await staffRes.json();
      const couponsData = await couponsRes.json();
      const ticketsData = await ticketsRes.json();
      const limitedData = await limitedRes.json();

      setServices(servicesData.data || []);
      setOptions(optionsData.data || []);
      setStaff(staffData.data?.filter(s => s.is_active) || []);
      setCoupons(couponsData.data || []);
      setTicketPlans(ticketsData.data || []);
      setLimitedOffers(limitedData.data || []);
    } catch (err) {
      console.error('マスタデータ取得エラー:', err);
      setError('データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const searchCustomers = async () => {
    if (!searchName.trim()) return;

    try {
      const response = await fetch(`/api/customers/search?name=${encodeURIComponent(searchName)}`);
      const data = await response.json();

      if (data.success) {
        setSearchResults(data.data || []);
        if (data.data?.length === 1) {
          selectCustomer(data.data[0]);
        }
      }
    } catch (err) {
      console.error('顧客検索エラー:', err);
      setSearchResults([]);
    }
  };

  const selectCustomer = async (customer) => {
    //console.log('選択された顧客データ:', customer); // デバッグ用
    setFormData(prev => ({
      ...prev,
      customerId: customer.customer_id,
      visitCount: customer.visit_count || 0,
      lastName: customer.last_name,
      firstName: customer.first_name,
      lastNameKana: customer.last_name_kana,
      firstNameKana: customer.first_name_kana,
      phoneNumber: customer.phone_number,
      email: customer.email,
      birthDate: customer.birth_date || '',
      gender: customer.gender || 'not_specified'
    }));

    //console.log('設定後のgender:', customer.gender); // デバッグ用

    try {
      const response = await fetch(`/api/customers/${customer.customer_id}/tickets`);
      const data = await response.json();
      if (data.success) {
        const allTickets = data.data || [];
        // 通常回数券
        const regularTickets = allTickets.filter(ticket => !ticket.is_limited);
        setCustomerTickets(regularTickets);
        // 期間限定回数券
        const limitedTickets = allTickets.filter(ticket => ticket.is_limited);
        setCustomerLimitedPurchases(limitedTickets);
      }
    } catch (err) {
      console.error('回数券情報取得エラー:', err);
    }

    setSearchResults([]);
    setSearchName('');
  };

  const calculateEndTime = (updatedFormData) => {
    let duration = 0;

    if (updatedFormData.bookingType === 'schedule') {
      return updatedFormData.endTime;
    }

    if (updatedFormData.serviceType === 'normal' && updatedFormData.serviceId) {
      const service = services.find(s => s.service_id === updatedFormData.serviceId);
      duration = service?.duration_minutes || 0;
    } else if (updatedFormData.serviceType === 'coupon' && updatedFormData.couponId) {
      const coupon = coupons.find(c => c.coupon_id === updatedFormData.couponId);
      duration = coupon?.total_duration_minutes || 60;
    } else {
      let maxDuration = 0;

      if (updatedFormData.ticketIds?.length > 0) {
        updatedFormData.ticketIds.forEach(ticketId => {
          const ticket = customerTickets.find(t => t.customer_ticket_id === ticketId);
          if (ticket) {
            const service = services.find(s => s.name === ticket.service_name);
            const ticketDuration = service?.duration_minutes || 60;
            if (ticketDuration > maxDuration) {
              maxDuration = ticketDuration;
            }
          }
        });
      }

      if (updatedFormData.limitedOfferIds?.length > 0) {
        updatedFormData.limitedOfferIds.forEach(offerId => {
          // purchased_プレフィックスがある場合は購入済みから探す
          if (offerId.startsWith('purchased_')) {
            const purchaseId = offerId.replace('purchased_', '');
            const purchase = customerLimitedPurchases.find(p => p.customer_ticket_id === purchaseId);
            if (purchase) {
              // 購入済みの場合はduration_minutesを直接使用
              const purchaseDuration = purchase.duration_minutes || 60;
              if (purchaseDuration > maxDuration) {
                maxDuration = purchaseDuration;
              }
            }
          } else {
            // 新規オファーの場合はマスタから
            const offer = limitedOffers.find(o => o.offer_id === offerId);
            const offerDuration = offer?.duration_minutes || 60;
            if (offerDuration > maxDuration) {
              maxDuration = offerDuration;
            }
          }
        });
      }

      duration = maxDuration;
    }

    const optionMinutes = updatedFormData.optionIds.reduce((sum, optId) => {
      const option = options.find(o => o.option_id === optId);
      return sum + (option?.duration_minutes || 0);
    }, 0);

    const totalMinutes = duration + optionMinutes;
    if (totalMinutes === 0) return updatedFormData.endTime;

    const [hour, minute] = updatedFormData.startTime.split(':').map(Number);
    const startMinutes = hour * 60 + minute;
    const endMinutes = startMinutes + totalMinutes;
    const endHour = Math.floor(endMinutes / 60);
    const endMinute = endMinutes % 60;

    return `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      if (field === 'serviceType') {
        if (value === 'normal') {
          updated.serviceId = '';
          updated.ticketIds = [];
          updated.couponId = '';
          updated.limitedOfferIds = [];
        } else if (value === 'coupon') {
          updated.serviceId = '';
          updated.ticketIds = [];
          updated.couponId = '';
          updated.limitedOfferIds = [];
        } else if (value === 'ticket') {
          updated.serviceId = '';
          updated.couponId = '';
        } else if (value === 'limited') {
          updated.serviceId = '';
          updated.couponId = '';
        }
      }

      if (updated.bookingType === 'booking' &&
        ['serviceId', 'serviceType', 'ticketIds', 'couponId', 'limitedOfferIds', 'startTime'].includes(field)) {
        updated.endTime = calculateEndTime(updated);
      }

      return updated;
    });
  };

  const handleTicketToggle = (ticketId) => {
    setFormData(prev => {
      const updated = { ...prev };
      if (prev.ticketIds.includes(ticketId)) {
        updated.ticketIds = prev.ticketIds.filter(id => id !== ticketId);
      } else {
        updated.ticketIds = [...prev.ticketIds, ticketId];
      }
      updated.endTime = calculateEndTime(updated);
      return updated;
    });
  };

  const handleLimitedOfferToggle = (purchaseId) => {
    // 購入済みオファーのpurchase_idで管理（回数券と同じ扱い）
    setFormData(prev => {
      const updated = { ...prev };
      if (prev.limitedOfferIds.includes(purchaseId)) {
        updated.limitedOfferIds = prev.limitedOfferIds.filter(id => id !== purchaseId);
      } else {
        updated.limitedOfferIds = [...prev.limitedOfferIds, purchaseId];
      }
      updated.endTime = calculateEndTime(updated);
      return updated;
    });
  };

  const handleOptionToggle = (optionId) => {
    setFormData(prev => {
      const updated = { ...prev };
      if (prev.optionIds.includes(optionId)) {
        updated.optionIds = prev.optionIds.filter(id => id !== optionId);
      } else {
        updated.optionIds = [...prev.optionIds, optionId];
      }
      updated.endTime = calculateEndTime(updated);
      return updated;
    });
  };

  const handleUpdate = async () => {
    if (!bookingId) return;

    setIsLoading(true);
    try {
      const updateData = {
        booking_id: bookingId,
        date: formData.date,
        start_time: formData.startTime,
        end_time: formData.endTime,
        staff_id: formData.staffId,
        bed_id: formData.bedId,
        status: 'confirmed',
        notes: formData.notes,
        // 施術メニュー関連を追加
        service_id: formData.serviceType === 'normal' ? formData.serviceId : null,
        customer_ticket_ids: formData.serviceType === 'ticket' ? formData.ticketIds : null,
        coupon_id: formData.serviceType === 'coupon' ? formData.couponId : null,
        limited_offer_ids: null,
        limited_purchase_ids: null,
        option_ids: formData.optionIds
      };

      // 期間限定の処理（新規登録と同じロジック）
      if (formData.serviceType === 'limited' && formData.limitedOfferIds.length > 0) {
        const purchasedIds = formData.limitedOfferIds
          .filter(id => id.startsWith('purchased_'))
          .map(id => id.replace('purchased_', ''));

        const newOfferIds = formData.limitedOfferIds
          .filter(id => !id.startsWith('purchased_'));

        if (purchasedIds.length > 0) {
          updateData.limited_purchase_ids = purchasedIds;
        }
        if (newOfferIds.length > 0) {
          updateData.limited_offer_ids = newOfferIds;
        }
      }

      const response = await fetch('/api/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      const result = await response.json();
      if (result.success) {
        alert('予約を更新しました');
        onClose();
        window.location.reload();
      } else {
        throw new Error(result.error || '予約更新に失敗しました');
      }
    } catch (err) {
      console.error('予約更新エラー:', err);
      setError(err.message || '予約更新中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!bookingId || !cancelType) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/bookings?id=${bookingId}&cancelType=${cancelType}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      if (result.success) {
        const cancelMessage = cancelType === 'with_contact'
          ? '予約をキャンセルしました(連絡あり)'
          : '予約をキャンセルしました(無断キャンセル)';
        alert(cancelMessage);
        onClose();
        window.location.reload();
      } else {
        throw new Error(result.error || 'キャンセルに失敗しました');
      }
    } catch (err) {
      console.error('キャンセルエラー:', err);
      setError(err.message || 'キャンセル中にエラーが発生しました');
    } finally {
      setIsLoading(false);
      setShowCancelModal(false);
    }
  };

  const handleSubmit = async () => {
    if (formData.bookingType === 'schedule') {
      if (!formData.staffId || !formData.date || !formData.startTime || !formData.endTime) {
        setError('スタッフと日時を入力してください');
        setTimeout(() => setError(''), 3000);
        return;
      }

      setIsLoading(true);
      try {
        const scheduleData = {
          customer_id: null,
          staff_id: formData.staffId,
          service_id: null,
          date: formData.date,
          start_time: formData.startTime,
          end_time: formData.endTime,
          bed_id: null,
          type: 'schedule',
          status: 'blocked',
          notes: formData.scheduleTitle || '予定'
        };

        const response = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(scheduleData)
        });

        const result = await response.json();
        if (result.success) {
          alert(`予定「${formData.scheduleTitle || '予定'}」を登録しました`);
          onClose();
          window.location.reload();
        } else {
          throw new Error(result.error || '予定登録に失敗しました');
        }
      } catch (err) {
        console.error('予定登録エラー:', err);
        setError(err.message || '予定登録中にエラーが発生しました');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const hasTickets = formData.ticketIds.length > 0;
    const hasLimitedOffers = formData.limitedOfferIds.length > 0;

    if (!formData.serviceId && !hasTickets && !formData.couponId && !hasLimitedOffers) {
      setError('施術メニューを選択してください');
      setTimeout(() => setError(''), 3000);
      return;
    }
    if (!formData.lastName || !formData.firstName) {
      setError('お客様名を入力してください');
      setTimeout(() => setError(''), 3000);
      return;
    }
    if (!formData.phoneNumber) {
      setError('電話番号を入力してください');
      setTimeout(() => setError(''), 3000);
      return;
    }
    if (!formData.staffId) {
      setError('スタッフを選択してください');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setIsLoading(true);
    try {
      let customerId = formData.customerId;
      if (!customerId) {
        const customerResponse = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            last_name: formData.lastName,
            first_name: formData.firstName,
            last_name_kana: formData.lastNameKana,
            first_name_kana: formData.firstNameKana,
            phone_number: formData.phoneNumber,
            email: formData.email,
            birth_date: formData.birthDate || null,
            gender: formData.gender || 'not_specified'
          })
        });

        const customerData = await customerResponse.json();
        if (customerData.success) {
          customerId = customerData.data.customer_id;
        }
      }

      const bookingData = {
        customer_id: customerId,
        staff_id: formData.staffId,
        date: formData.date,
        start_time: formData.startTime,
        end_time: formData.endTime,
        bed_id: formData.bedId,
        option_ids: formData.optionIds,
        notes: formData.notes,
        status: 'confirmed',
        type: 'booking',
        service_id: null,
        customer_ticket_ids: null,
        coupon_id: null,
        limited_offer_ids: null
      };

      if (formData.serviceType === 'normal' && formData.serviceId) {
        bookingData.service_id = formData.serviceId;
      }
      if (formData.serviceType === 'coupon' && formData.couponId) {
        bookingData.coupon_id = formData.couponId;
      }
      if (formData.ticketIds.length > 0) {
        bookingData.customer_ticket_ids = formData.ticketIds;
      }
      if (formData.limitedOfferIds.length > 0) {
        // 購入済みと新規を分離
        const purchasedIds = formData.limitedOfferIds
          .filter(id => id.startsWith('purchased_'))
          .map(id => id.replace('purchased_', ''));

        const newOfferIds = formData.limitedOfferIds
          .filter(id => !id.startsWith('purchased_'));

        if (purchasedIds.length > 0) {
          bookingData.limited_purchase_ids = purchasedIds;
        }
        if (newOfferIds.length > 0) {
          bookingData.limited_offer_ids = newOfferIds;
        }
      }

      const bookingResponse = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });

      const result = await bookingResponse.json();
      if (result.success) {
        alert('予約を登録しました');
        onClose();
        window.location.reload();
      } else {
        throw new Error(result.error || '予約登録に失敗しました');
      }
    } catch (err) {
      console.error('予約登録エラー:', err);
      setError(err.message || '予約登録中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const groupedServices = services.reduce((acc, service) => {
    const category = service.category || 'その他';
    if (!acc[category]) acc[category] = [];
    acc[category].push(service);
    return acc;
  }, {});

  const groupedOptions = options.reduce((acc, option) => {
    const category = option.category || 'その他';
    if (!acc[category]) acc[category] = [];
    acc[category].push(option);
    return acc;
  }, {});

  if (!activeModal) return null;

  if (showCancelModal) {
    return (
      <div className="booking-page">
        <div className="cancel-modal-overlay">
          <div className="cancel-modal">
            <div className="cancel-modal-header">
              <AlertTriangle size={24} color="#ef4444" />
              <h3>予約キャンセル</h3>
            </div>

            <div className="cancel-modal-content">
              <p>キャンセルの種類を選択してください</p>

              <div className="cancel-type-buttons">
                <button
                  className={`cancel-type-btn ${cancelType === 'with_contact' ? 'selected' : ''}`}
                  onClick={() => setCancelType('with_contact')}
                >
                  <Phone size={20} />
                  <div>
                    <div className="cancel-type-title">連絡ありキャンセル</div>
                    <div className="cancel-type-desc">お客様から事前に連絡があった</div>
                  </div>
                </button>

                <button
                  className={`cancel-type-btn cancel-type-btn--no-contact ${cancelType === 'no_contact' ? 'selected' : ''}`}
                  onClick={() => setCancelType('no_contact')}
                >
                  <Ban size={20} />
                  <div>
                    <div className="cancel-type-title">無断キャンセル</div>
                    <div className="cancel-type-desc">連絡なく来店されなかった</div>
                  </div>
                </button>
              </div>
            </div>

            <div className="cancel-modal-actions">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelType('');
                }}
                className="action-btn action-btn--cancel"
              >
                戻る
              </button>
              <button
                onClick={handleCancel}
                className="action-btn action-btn--danger"
                disabled={!cancelType || isLoading}
              >
                {isLoading ? 'キャンセル中...' : '確定してキャンセル'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ★ 施術内容表示モード（支払い済み）
  if (isCompletedMode && activeModal === 'booking') {
    const booking = selectedSlot?.bookingData;
    const staffName = staff.find(s => s.staff_id === formData.staffId)?.name || booking?.staff_name || '未設定';

    // メニュー名を取得
    let menuName = '';
    if (booking?.service_name) {
      menuName = booking.service_name;
    } else if (booking?.direct_service_name) {
      menuName = booking.direct_service_name;
    } else if (booking?.ticket_plan_name) {
      menuName = booking.ticket_plan_name;
    } else if (booking?.coupon_name) {
      menuName = booking.coupon_name;
    } else if (booking?.limited_offer_name) {
      menuName = booking.limited_offer_name;
    }

    // 支払い方法の表示
    const getPaymentMethodLabel = (method) => {
      const labels = { 'cash': '現金', 'card': 'カード', 'mixed': '現金+カード' };
      return labels[method] || method;
    };

    // 時間フォーマット（秒を除去）
    const formatTime = (time) => {
      if (!time) return '';
      return time.substring(0, 5);
    };

    return (
      <div className="booking-page">
        <div className="booking-page-content">
          <div className="booking-page-header">
            <div className="completed-header-left">
              <h2>施術内容</h2>
              <span className="completed-customer-inline">
                {formData.lastName} {formData.firstName} 様
                {formData.visitCount > 0 && (
                  <span className="visit-count-badge">{formData.visitCount}回目</span>
                )}
              </span>
            </div>
            <div className="completed-header-right">
              <span className="completed-status-badge">
                <Check size={14} />
                会計済
              </span>
              <button onClick={onClose} className="booking-page-close">
                <X size={20} />
                閉じる
              </button>
            </div>
          </div>

          {/* メインコンテンツ */}
          <div className="completed-content">
            {/* 施術情報カード */}
            <div className="completed-card">
              <div className="completed-card-row">
                <span className="completed-card-label">日時</span>
                <span className="completed-card-value">{formData.date} {formatTime(formData.startTime)}〜{formatTime(formData.endTime)}</span>
              </div>
              <div className="completed-card-row">
                <span className="completed-card-label">担当</span>
                <span className="completed-card-value">{staffName}</span>
              </div>
              <div className="completed-card-row">
                <span className="completed-card-label">メニュー</span>
                <span className="completed-card-value">{menuName || '未設定'}</span>
              </div>
              {booking?.options && booking.options.length > 0 && (
                <div className="completed-card-row">
                  <span className="completed-card-label">オプション</span>
                  <span className="completed-card-value">
                    {booking.options.map(opt => opt.name).join('、')}
                  </span>
                </div>
              )}
            </div>

            {/* 支払い情報カード */}
            {paymentInfo && (
              <div className="completed-card completed-card--payment">
                <div className="completed-card-row">
                  <span className="completed-card-label">支払方法</span>
                  <span className="completed-card-value">{getPaymentMethodLabel(paymentInfo.payment_method)}</span>
                </div>
                {paymentInfo.service_subtotal > 0 && (
                  <div className="completed-card-row">
                    <span className="completed-card-label">施術料金</span>
                    <span className="completed-card-value">¥{paymentInfo.service_subtotal.toLocaleString()}</span>
                  </div>
                )}
                {paymentInfo.options && paymentInfo.options.length > 0 && (
                  <>
                    <div className="completed-card-divider" />
                    {paymentInfo.options.map((opt, idx) => (
                      <div key={idx} className="completed-card-row completed-card-row--sub">
                        <span className="completed-card-label">
                          {opt.option_name}
                          {opt.is_free ? <span className="completed-option-free-badge">無料</span> : ''}
                        </span>
                        <span className="completed-card-value">
                          {opt.is_free ? '¥0' : `¥${(opt.price * (opt.quantity || 1)).toLocaleString()}`}
                        </span>
                      </div>
                    ))}
                  </>
                )}
                {paymentInfo.discount_amount > 0 && (
                  <div className="completed-card-row">
                    <span className="completed-card-label">割引</span>
                    <span className="completed-card-value completed-card-value--discount">-¥{paymentInfo.discount_amount.toLocaleString()}</span>
                  </div>
                )}
                <div className="completed-card-row completed-card-row--total">
                  <span className="completed-card-label">合計</span>
                  <span className="completed-card-value completed-card-value--total">¥{(paymentInfo.total_amount || 0).toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* 備考 */}
            {formData.notes && (
              <div className="completed-notes-section">
                <div className="completed-notes-label">備考</div>
                <div className="completed-notes-text">{formData.notes}</div>
              </div>
            )}
          </div>

        </div>
      </div>
    );
  }

  if (activeModal === 'booking') {
    return (
      <>
      <div className="booking-page">
        <div className="booking-page-content">
          <div className="booking-page-header">
            <h2>{isEditMode ? '予約編集' : '新規登録'}</h2>
            <button onClick={onClose} className="booking-page-close">
              <X size={20} />
              閉じる
            </button>
          </div>

          {!isEditMode && (
            <div className="booking-type-selector">
              <button
                className={`booking-type-btn ${formData.bookingType === 'booking' ? 'booking-type-btn--active' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, bookingType: 'booking' }))}
              >
                <CalendarCheck size={20} />
                予約
              </button>
              <button
                className={`booking-type-btn ${formData.bookingType === 'schedule' ? 'booking-type-btn--active' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, bookingType: 'schedule' }))}
              >
                <CalendarPlus size={20} />
                予定
              </button>
            </div>
          )}

          {error && (
            <div className="booking-alert booking-alert--error">
              <AlertCircle size={16} />
              <span>{error}</span>
              <button onClick={() => setError('')}>×</button>
            </div>
          )}

          <div className="booking-page-grid">
            <div className="booking-page-main">
              <div className="booking-section">
                <div className="section-header">
                  <Calendar size={18} />
                  {formData.bookingType === 'booking' ? '予約情報' : '予定情報'}
                </div>
                <div className="section-content">
                  <div className="form-row">
                    <label className="form-label">
                      日時 <span className="required">●</span>
                    </label>
                    <div className="datetime-inputs">
                      <button
                        type="button"
                        onClick={() => setShowDatePicker(true)}
                        className="form-input form-input--date"
                        style={{
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <span>
                          {formData.date
                            ? (() => {
                                const d = new Date(formData.date);
                                return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
                              })()
                            : '日付を選択'
                          }
                        </span>
                        <span style={{ color: '#9ca3af' }}>▼</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowStartTimePicker(true)}
                        className="form-input form-input--time"
                        style={{
                          textAlign: 'center',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <span>{formData.startTime || '00:00'}</span>
                        <span style={{ color: '#9ca3af' }}>▼</span>
                      </button>
                      <span className="time-separator">〜</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (formData.bookingType === 'schedule' || isEditMode) {
                            setShowEndTimePicker(true);
                          }
                        }}
                        className="form-input form-input--time"
                        style={{
                          textAlign: 'center',
                          cursor: (formData.bookingType === 'schedule' || isEditMode) ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          opacity: (formData.bookingType === 'booking' && !isEditMode) ? 0.6 : 1
                        }}
                      >
                        <span>{formData.endTime || '00:00'}</span>
                        <span style={{ color: '#9ca3af' }}>▼</span>
                      </button>
                    </div>
                  </div>

                  <div className="form-row">
                    <label className="form-label">
                      担当スタッフ <span className="required">●</span>
                    </label>
                    <div className="staff-select-grid">
                      {staff.map(s => (
                        <div
                          key={s.staff_id}
                          className={`staff-select-card ${formData.staffId === s.staff_id ? 'selected' : ''}`}
                          onClick={() => handleInputChange('staffId', s.staff_id)}
                        >
                          <div
                            className="staff-select-color"
                            style={{ backgroundColor: s.color }}
                          />
                          <div className="staff-select-name">{s.name}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {formData.bookingType === 'booking' && (
                    <div className="form-row">
                      <label className="form-label">
                        ベッド <span className="required">●</span>
                      </label>
                      <div className="bed-select-grid">
                        {['1', '2'].map(bedId => (
                          <div
                            key={bedId}
                            className={`bed-select-card ${formData.bedId === bedId ? 'selected' : ''}`}
                            onClick={() => handleInputChange('bedId', bedId)}
                          >
                            ベッド{bedId}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {formData.bookingType === 'schedule' && (
                    <div className="form-row">
                      <label className="form-label">予定タイトル</label>
                      <input
                        type="text"
                        value={formData.scheduleTitle}
                        onChange={(e) => handleInputChange('scheduleTitle', e.target.value)}
                        className="form-input"
                        placeholder="例: 休憩、会議、研修、外出など"
                      />
                    </div>
                  )}
                </div>
              </div>

              {formData.bookingType === 'booking' && (
                <div className="menu-type-tabs">
                  <button
                    className={`menu-type-tab ${formData.serviceType === 'normal' ? 'active' : ''}`}
                    onClick={() => handleInputChange('serviceType', 'normal')}
                  >
                    通常メニュー
                  </button>
                  <button
                    className={`menu-type-tab ${formData.serviceType === 'ticket' ? 'active' : ''}`}
                    onClick={() => handleInputChange('serviceType', 'ticket')}
                  >
                    回数券
                    {formData.ticketIds.length > 0 && (
                      <span className="menu-tab-badge">{formData.ticketIds.length}</span>
                    )}
                  </button>
                  <button
                    className={`menu-type-tab ${formData.serviceType === 'coupon' ? 'active' : ''}`}
                    onClick={() => handleInputChange('serviceType', 'coupon')}
                  >
                    クーポン
                  </button>
                  <button
                    className={`menu-type-tab ${formData.serviceType === 'limited' ? 'active' : ''}`}
                    onClick={() => handleInputChange('serviceType', 'limited')}
                  >
                    期間限定
                    {formData.limitedOfferIds.length > 0 && (
                      <span className="menu-tab-badge">{formData.limitedOfferIds.length}</span>
                    )}
                  </button>
                </div>
              )}



              {formData.bookingType === 'booking' && (
                <div className="booking-section">
                  <div className="section-header">
                    <Package size={18} />
                    施術メニュー
                  </div>
                  <div className="section-content">
                    {formData.serviceType === 'normal' && (
                      <div className="menu-select-list">
                        {Object.entries(groupedServices)
                          .sort(([categoryA], [categoryB]) => {
                            // 「その他」カテゴリーを最後に
                            if (categoryA === 'その他') return 1;
                            if (categoryB === 'その他') return -1;
                            return categoryA.localeCompare(categoryB, 'ja');
                          })
                          .map(([category, categoryServices]) => (
                            <div key={category} className="menu-category-group">
                              <div className="menu-category-header">{category}</div>
                              {categoryServices.map(service => (
                                <div
                                  key={service.service_id}
                                  className={`menu-select-item ${formData.serviceId === service.service_id ? 'selected' : ''}`}
                                  onClick={() => handleInputChange('serviceId', service.service_id)}
                                >
                                  <input
                                    type="radio"
                                    name="service"
                                    checked={formData.serviceId === service.service_id}
                                    onChange={() => { }}
                                    className="menu-radio"
                                  />
                                  <div className="menu-info">
                                    <div className="menu-name">{service.name}</div>
                                    <div className="menu-details">
                                      <Clock size={14} />
                                      {service.duration_minutes}分
                                      {service.description && ` - ${service.description}`}
                                    </div>
                                  </div>
                                  <div className="menu-price">
                                    ¥{service.price.toLocaleString()}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                      </div>
                    )}

                    {formData.serviceType === 'ticket' && (
                      <div className="menu-select-list">
                        {customerTickets.length > 0 ? (
                          customerTickets.map(ticket => (
                            <div
                              key={ticket.customer_ticket_id}
                              className={`menu-select-item ${formData.ticketIds.includes(ticket.customer_ticket_id) ? 'selected' : ''}`}
                              onClick={() => handleTicketToggle(ticket.customer_ticket_id)}
                            >
                              <input
                                type="checkbox"
                                checked={formData.ticketIds.includes(ticket.customer_ticket_id)}
                                onChange={() => { }}
                                className="menu-radio"
                              />
                              <div className="menu-info">
                                <div className="menu-name">{ticket.plan_name}</div>
                                <div className="menu-details">
                                  残り{ticket.sessions_remaining}回 / 有効期限: {ticket.expiry_date}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="no-items-message">
                            顧客情報を入力すると、保有回数券が表示されます
                          </div>
                        )}
                      </div>
                    )}

                    {formData.serviceType === 'coupon' && (
                      <div className="menu-select-list">
                        {coupons.filter(c => c.is_active).map(coupon => (
                          <div
                            key={coupon.coupon_id}
                            className={`menu-select-item ${formData.couponId === coupon.coupon_id ? 'selected' : ''}`}
                            onClick={() => handleInputChange('couponId', coupon.coupon_id)}
                          >
                            <input
                              type="radio"
                              name="coupon"
                              checked={formData.couponId === coupon.coupon_id}
                              onChange={() => { }}
                              className="menu-radio"
                            />
                            <div className="menu-info">
                              <div className="menu-name">
                                <Tag size={14} />
                                {coupon.name}
                              </div>
                              <div className="menu-details">{coupon.description}</div>
                            </div>
                            <div className="menu-price">
                              ¥{coupon.total_price.toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {formData.serviceType === 'limited' && (
                      <div className="menu-select-list">
                        {customerLimitedPurchases.length > 0 ? (
                          customerLimitedPurchases.map(purchase => {
                            const purchaseKey = `purchased_${purchase.customer_ticket_id}`;
                            const isSelected = formData.limitedOfferIds.includes(purchaseKey);

                            return (
                              <div
                                key={purchase.customer_ticket_id}
                                className={`menu-select-item ${isSelected ? 'selected' : ''}`}
                                onClick={() => handleLimitedOfferToggle(purchaseKey)}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => { }}
                                  className="menu-radio"
                                />
                                <div className="menu-info">
                                  <div className="menu-name">
                                    <Timer size={14} />
                                    {purchase.plan_name}
                                  </div>
                                  <div className="menu-details">
                                    残り{purchase.sessions_remaining}回 / 有効期限: {purchase.expiry_date}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="no-items-message">
                            {formData.customerId
                              ? '購入済みの期間限定オファーがありません'
                              : '顧客情報を入力すると、購入済みオファーが表示されます'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {formData.bookingType === 'booking' && !isEditMode && (
                <div className="booking-section">
                  <div className="section-header">
                    <Settings2 size={18} />
                    オプション(複数選択可)
                  </div>
                  <div className="section-content">
                    {Object.entries(groupedOptions).map(([category, categoryOptions]) => (
                      <div key={category} className="option-category-group">
                        <div className="option-category-label">{category}</div>
                        <div className="option-checkbox-list">
                          {categoryOptions.map(option => (
                            <label key={option.option_id} className="option-checkbox-item">
                              <input
                                type="checkbox"
                                checked={formData.optionIds.includes(option.option_id)}
                                onChange={() => handleOptionToggle(option.option_id)}
                                className="option-checkbox"
                              />
                              <span className="option-name">{option.name}</span>
                              {option.duration_minutes > 0 && (
                                <span className="option-duration">+{option.duration_minutes}分</span>
                              )}
                              <span className="option-price">+¥{option.price.toLocaleString()}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="booking-page-side">
              {formData.bookingType === 'booking' ? (
                <>
                  <div className="booking-section">
                    <div className="section-header">
                      <User size={18} />
                      お客様情報
                    </div>
                    <div className="section-content">
                      {!isEditMode && (
                        <div className="form-row">
                          <label className="form-label">お客様検索(名前)</label>
                          <div className="customer-search-box">
                            <input
                              type="text"
                              placeholder="姓名を入力(例: 田中、田中花)"
                              value={searchName}
                              onChange={(e) => setSearchName(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && searchCustomers()}
                              className="form-input"
                            />
                            <button onClick={searchCustomers} className="search-btn">
                              <Search size={18} />
                              検索
                            </button>
                          </div>

                          {searchResults.length > 0 && (
                            <div className="search-results">
                              {searchResults.map(customer => (
                                <div
                                  key={customer.customer_id}
                                  className="search-result-item"
                                  onClick={() => selectCustomer(customer)}
                                >
                                  <div className="result-name">
                                    {customer.last_name} {customer.first_name}
                                    ({customer.last_name_kana} {customer.first_name_kana})
                                  </div>
                                  <div className="result-info">
                                    <Phone size={14} />
                                    {customer.phone_number}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {isEditMode && formData.customerId && (
                        <div className="customer-info-card">
                          <div className="customer-info-header">
                            <span className="customer-name">
                              {formData.lastName} {formData.firstName}
                            </span>
                            {formData.visitCount > 0 && (
                              <span className="customer-visit-badge">{formData.visitCount}回目</span>
                            )}
                          </div>
                          <div className="customer-info-body">
                            <div className="customer-info-row">
                              <span className="customer-info-label">フリガナ</span>
                              <span className="customer-info-value">{formData.lastNameKana} {formData.firstNameKana}</span>
                            </div>
                            {formData.birthDate && (
                              <div className="customer-info-row">
                                <span className="customer-info-label">生年月日</span>
                                <span className="customer-info-value">{formData.birthDate}</span>
                              </div>
                            )}
                            {formData.gender && formData.gender !== 'not_specified' && (
                              <div className="customer-info-row">
                                <span className="customer-info-label">性別</span>
                                <span className="customer-info-value">{getGenderLabel(formData.gender)}</span>
                              </div>
                            )}
                            <div className="customer-info-row">
                              <span className="customer-info-label">電話番号</span>
                              <span className="customer-info-value">{formData.phoneNumber}</span>
                            </div>
                            {formData.email && (
                              <div className="customer-info-row">
                                <span className="customer-info-label">メール</span>
                                <span className="customer-info-value">{formData.email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {!isEditMode && (
                        <>
                          <div className="form-row">
                            <label className="form-label">
                              氏名(カナ) <span className="required">●</span>
                            </label>
                            <div className="name-input-group">
                              <input
                                type="text"
                                placeholder="セイ"
                                value={formData.lastNameKana}
                                onChange={(e) => handleInputChange('lastNameKana', e.target.value)}
                                className="form-input"
                              />
                              <input
                                type="text"
                                placeholder="メイ"
                                value={formData.firstNameKana}
                                onChange={(e) => handleInputChange('firstNameKana', e.target.value)}
                                className="form-input"
                              />
                            </div>
                          </div>

                          <div className="form-row">
                            <label className="form-label">
                              氏名(漢字) <span className="required">●</span>
                            </label>
                            <div className="name-input-group">
                              <input
                                type="text"
                                placeholder="姓"
                                value={formData.lastName}
                                onChange={(e) => handleInputChange('lastName', e.target.value)}
                                className="form-input"
                              />
                              <input
                                type="text"
                                placeholder="名"
                                value={formData.firstName}
                                onChange={(e) => handleInputChange('firstName', e.target.value)}
                                className="form-input"
                              />
                            </div>
                          </div>

                          <div className="form-row">
                            <label className="form-label">
                              電話番号 <span className="required">●</span>
                            </label>
                            <input
                              type="tel"
                              placeholder="090-0000-0000"
                              value={formData.phoneNumber}
                              onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                              className="form-input"
                            />
                          </div>

                          <div className="form-row">
                            <label className="form-label">メールアドレス</label>
                            <input
                              type="email"
                              placeholder="example@email.com"
                              value={formData.email}
                              onChange={(e) => handleInputChange('email', e.target.value)}
                              className="form-input"
                            />
                          </div>

                          <div className="form-row">
                            <label className="form-label">生年月日</label>
                            <button
                              type="button"
                              onClick={() => setShowBirthDatePicker(true)}
                              className="form-input"
                              style={{
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: '#fff'
                              }}
                            >
                              <span style={{ color: formData.birthDate ? '#111827' : '#9ca3af' }}>
                                {formData.birthDate
                                  ? (() => {
                                      const d = new Date(formData.birthDate);
                                      return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
                                    })()
                                  : '選択してください'
                                }
                              </span>
                              <span style={{ color: '#9ca3af' }}>▼</span>
                            </button>
                          </div>

                          <div className="form-row">
                            <label className="form-label">性別</label>
                            <select
                              value={formData.gender}
                              onChange={(e) => handleInputChange('gender', e.target.value)}
                              className="form-input"
                            >
                              <option value="not_specified">未設定</option>
                              <option value="male">男性</option>
                              <option value="female">女性</option>
                              <option value="other">その他</option>
                            </select>
                          </div>

                          <div className="form-row">
                            <label className="form-label">お客様番号</label>
                            <input
                              type="text"
                              value={formData.customerId || '(新規顧客)'}
                              disabled
                              className="form-input form-input--disabled"
                            />
                          </div>

                          <div className="form-row">
                            <label className="form-label">来店回数</label>
                            <input
                              type="text"
                              value={formData.customerId ? `${formData.visitCount}回` : '-'}
                              disabled
                              className="form-input form-input--disabled"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="booking-section">
                    <div className="section-header">
                      <Mail size={18} />
                      備考
                    </div>
                    <div className="section-content">
                      <textarea
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        className="form-textarea"
                        rows="5"
                        placeholder="特記事項があれば入力してください"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="booking-section">
                  <div className="section-header">
                    <CalendarPlus size={18} />
                    予定の詳細
                  </div>
                  <div className="section-content">
                    <div className="schedule-info-box">
                      <div className="schedule-info-item">
                        <span className="schedule-info-label">スタッフ:</span>
                        <span className="schedule-info-value">
                          {staff.find(s => s.staff_id === formData.staffId)?.name || '未選択'}
                        </span>
                      </div>
                      <div className="schedule-info-item">
                        <span className="schedule-info-label">日付:</span>
                        <span className="schedule-info-value">{formData.date || '未選択'}</span>
                      </div>
                      <div className="schedule-info-item">
                        <span className="schedule-info-label">時間:</span>
                        <span className="schedule-info-value">
                          {formData.startTime} 〜 {formData.endTime || '未設定'}
                        </span>
                      </div>
                      <div className="schedule-info-item">
                        <span className="schedule-info-label">予定内容:</span>
                        <span className="schedule-info-value">
                          {formData.scheduleTitle || '未入力'}
                        </span>
                      </div>
                    </div>

                    <div className="schedule-note">
                      <AlertCircle size={16} />
                      <span>この時間帯は予約を受け付けません</span>
                    </div>

                    <div className="form-row">
                      <label className="form-label">メモ</label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        className="form-textarea"
                        rows="4"
                        placeholder="詳細情報があれば入力してください"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="booking-actions-section">
                {isEditMode ? (
                  <>
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="action-btn action-btn--danger"
                      disabled={isLoading}
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleUpdate}
                      className="action-btn action-btn--primary"
                      disabled={isLoading}
                    >
                      {isLoading ? '更新中...' : '予約を更新'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={onClose}
                      className="action-btn action-btn--cancel"
                      disabled={isLoading}
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleSubmit}
                      className="action-btn action-btn--primary"
                      disabled={isLoading}
                    >
                      {isLoading ? '登録中...' : formData.bookingType === 'booking' ? '予約を登録' : '予定を登録'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 誕生日スクロールピッカー */}
      <DateScrollPicker
        isOpen={showBirthDatePicker}
        onClose={() => setShowBirthDatePicker(false)}
        onConfirm={(date) => handleInputChange('birthDate', date)}
        initialDate={formData.birthDate || '1990-01-01'}
      />

      {/* 予約日スクロールピッカー */}
      <DateScrollPicker
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onConfirm={(date) => handleInputChange('date', date)}
        initialDate={formData.date || new Date().toISOString().split('T')[0]}
      />

      {/* 開始時間スクロールピッカー */}
      <TimeScrollPicker
        isOpen={showStartTimePicker}
        onClose={() => setShowStartTimePicker(false)}
        onConfirm={(time) => handleInputChange('startTime', time)}
        initialTime={formData.startTime || '10:00'}
      />

      {/* 終了時間スクロールピッカー */}
      <TimeScrollPicker
        isOpen={showEndTimePicker}
        onClose={() => setShowEndTimePicker(false)}
        onConfirm={(time) => handleInputChange('endTime', time)}
        initialTime={formData.endTime || '11:00'}
      />
    </>
  );
}

return null;
};

export default BookingModal;