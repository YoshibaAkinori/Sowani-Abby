"use client";
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, CreditCard, Users, Package, Check, AlertCircle, Sparkles, X, UserPlus, Calendar } from 'lucide-react';
import './register.css';
import NumericKeypad from './Numerickeypad';
import CheckoutCompleteModal from '../components/CheckoutCompleteModal';
import DateScrollPicker from '../components/DateScrollPicker';

const RegisterPage = () => {
  // 顧客選択
  const [customerTab, setCustomerTab] = useState('today');
  const [todayBookings, setTodayBookings] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [ticketUseOnPurchase, setTicketUseOnPurchase] = useState({});
  const [ticketCustomPrices, setTicketCustomPrices] = useState({});
  const [useMonitorPrice, setUseMonitorPrice] = useState({});
  const [showCheckoutComplete, setShowCheckoutComplete] = useState(false);
  const [completedPaymentId, setCompletedPaymentId] = useState(null);
  // 既存のstate付近に追加
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // 支払い済み予約の表示用
  const [paidBookingInfo, setPaidBookingInfo] = useState(null);


  // 新規顧客登録フォーム
  const [newCustomer, setNewCustomer] = useState({
    lastName: '',
    firstName: '',
    lastNameKana: '',
    firstNameKana: '',
    phoneNumber: '',
    email: '',
    birthDate: '',
    gender: 'not_specified'
  });
  const [showNewCustomerBirthDatePicker, setShowNewCustomerBirthDatePicker] = useState(false);
  const [newCustomerError, setNewCustomerError] = useState('');

  // 施術・メニュー
  const [menuTab, setMenuTab] = useState('normal');
  const [services, setServices] = useState([]);
  const [ownedTickets, setOwnedTickets] = useState([]);
  const [availableTicketPlans, setAvailableTicketPlans] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [limitedOffers, setLimitedOffers] = useState([]);
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [selectedMenuType, setSelectedMenuType] = useState('normal');

  // 回数券使用リスト（複数選択可能）
  const [ticketUseList, setTicketUseList] = useState([]);

  // 期間限定オファー使用リスト（複数選択可能）
  const [limitedOfferUseList, setLimitedOfferUseList] = useState([]);
  // 回数券購入リスト
  const [ticketPurchaseList, setTicketPurchaseList] = useState([]);

  // オプション
  const [options, setOptions] = useState([]);
  const [selectedFreeOptions, setSelectedFreeOptions] = useState([]);
  const [selectedPaidOptions, setSelectedPaidOptions] = useState([]);

  // 支払い・割引
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cashAmount, setCashAmount] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');

  // 10キーモーダル
  const [showKeypad, setShowKeypad] = useState(false);
  const [keypadTarget, setKeypadTarget] = useState(null);
  const [keypadPosition, setKeypadPosition] = useState({ top: 0, left: 0 });
  const inputRefs = useRef({});

  // UI
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 予約詳細を保持する state
  const [pendingBookingDetail, setPendingBookingDetail] = useState(null);
  const [hasProcessedBooking, setHasProcessedBooking] = useState(false);
  const [ticketsLoaded, setTicketsLoaded] = useState(false);  // 回数券ロード完了フラグ

  // 初期データ読み込み
  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await fetch(`/api/customers/today-bookings?date=${bookingDate}`);
        const data = await res.json();
        setTodayBookings(data.data || []);
      } catch (err) {
        console.error('予約取得エラー:', err);
      }
    };
    fetchBookings();
  }, [bookingDate]);

  useEffect(() => {
    if (hasProcessedBooking) {
      return;
    }

    if (!pendingBookingDetail) {
      return;
    }

    if (!ticketsLoaded) {  // ★ 変更: ロード完了を待つ
      return;
    }


    // ★ 処理フラグを先に立てる
    setHasProcessedBooking(true);

    // 複数回数券の処理
    if (pendingBookingDetail.tickets && pendingBookingDetail.tickets.length > 0) {

      const ticketsToAdd = [];
      const paymentsToAdd = []; // ★ 未払い分リスト

      pendingBookingDetail.tickets.forEach(ticketData => {
        const ticket = ownedTickets.find(t => t.customer_ticket_id === ticketData.customer_ticket_id);
        if (ticket) {
          ticketsToAdd.push(ticket);

          // ★ 未払いがある場合は購入リストに追加
          if (ticket.remaining_payment && ticket.remaining_payment > 0) {
            const ticketPayment = {
              id: `payment-${ticket.customer_ticket_id}`,
              customer_ticket_id: ticket.customer_ticket_id,
              name: ticket.plan_name,
              service_name: ticket.service_name,
              total_sessions: ticket.total_sessions,
              full_price: ticket.purchase_price,
              already_paid: ticket.purchase_price - ticket.remaining_payment,
              remaining_payment: ticket.remaining_payment,
              payment_amount: '',
              is_additional_payment: true
            };
            paymentsToAdd.push(ticketPayment);
          }
        }
      });


      if (ticketsToAdd.length > 0) {
        setTicketUseList(ticketsToAdd);
        setSelectedMenu(null);
        setSelectedMenuType('normal');

        // ★ 未払い分を購入リストに追加
        if (paymentsToAdd.length > 0) {
          setTicketPurchaseList(prev => {
            // 重複チェック
            const newPayments = paymentsToAdd.filter(payment =>
              !prev.find(p => p.customer_ticket_id === payment.customer_ticket_id)
            );
            return [...prev, ...newPayments];
          });
        }

        if (pendingBookingDetail.options && pendingBookingDetail.options.length > 0) {
          const optionIds = pendingBookingDetail.options.map(opt => opt.option_id);
          const maxFreeOptions = ticketsToAdd[0]?.service_free_option_choices || 0;

          if (maxFreeOptions > 0 && optionIds.length <= maxFreeOptions) {
            setSelectedFreeOptions(optionIds);
            setSelectedPaidOptions([]);
          } else if (maxFreeOptions > 0) {
            setSelectedFreeOptions(optionIds.slice(0, maxFreeOptions));
            setSelectedPaidOptions(optionIds.slice(maxFreeOptions));
          } else {
            setSelectedFreeOptions([]);
            setSelectedPaidOptions(optionIds);
          }
        }
      }
    }
    // 単一回数券の処理(後方互換性)
    else if (pendingBookingDetail.customer_ticket_id) {

      const ticket = ownedTickets.find(t => t.customer_ticket_id === pendingBookingDetail.customer_ticket_id);
      if (ticket) {
        setTicketUseList([ticket]);
        setSelectedMenu(null);
        setSelectedMenuType('normal');

        // ★ 未払いがある場合は購入リストに追加
        if (ticket.remaining_payment && ticket.remaining_payment > 0) {
          const ticketPayment = {
            id: `payment-${ticket.customer_ticket_id}`,
            customer_ticket_id: ticket.customer_ticket_id,
            name: ticket.plan_name,
            service_name: ticket.service_name,
            total_sessions: ticket.total_sessions,
            full_price: ticket.purchase_price,
            already_paid: ticket.purchase_price - ticket.remaining_payment,
            remaining_payment: ticket.remaining_payment,
            payment_amount: '',
            is_additional_payment: true
          };

          setTicketPurchaseList(prev => {
            const exists = prev.find(p => p.customer_ticket_id === ticket.customer_ticket_id);
            if (exists) return prev;
            return [...prev, ticketPayment];
          });
        }

        if (pendingBookingDetail.options && pendingBookingDetail.options.length > 0) {
          const optionIds = pendingBookingDetail.options.map(opt => opt.option_id);
          const maxFreeOptions = ticket.service_free_option_choices || 0;

          if (maxFreeOptions > 0 && optionIds.length <= maxFreeOptions) {
            setSelectedFreeOptions(optionIds);
            setSelectedPaidOptions([]);
          } else if (maxFreeOptions > 0) {
            setSelectedFreeOptions(optionIds.slice(0, maxFreeOptions));
            setSelectedPaidOptions(optionIds.slice(maxFreeOptions));
          } else {
            setSelectedFreeOptions([]);
            setSelectedPaidOptions(optionIds);
          }
        }
      }
    }

    // 期間限定オファーの処理（購入済みの期間限定回数券をownedTicketsから探す）
    if (pendingBookingDetail.limited_offers && pendingBookingDetail.limited_offers.length > 0) {
      const offersToAdd = [];
      const paymentsToAdd = [];

      pendingBookingDetail.limited_offers.forEach(offerData => {
        // ownedTicketsからis_limited: trueかつoffer_idが一致するものを探す
        const ticket = ownedTickets.find(t => 
          t.is_limited && t.limited_offer_id === offerData.offer_id
        );
        if (ticket) {
          offersToAdd.push(ticket);

          // 未払いがある場合は購入リストに追加
          if (ticket.remaining_payment && ticket.remaining_payment > 0) {
            const ticketPayment = {
              id: `payment-${ticket.customer_ticket_id}`,
              customer_ticket_id: ticket.customer_ticket_id,
              name: ticket.plan_name,
              service_name: ticket.service_name,
              total_sessions: ticket.total_sessions,
              full_price: ticket.purchase_price,
              already_paid: ticket.purchase_price - ticket.remaining_payment,
              remaining_payment: ticket.remaining_payment,
              payment_amount: '',
              is_additional_payment: true,
              is_limited_ticket: true
            };
            paymentsToAdd.push(ticketPayment);
          }
        }
      });

      if (offersToAdd.length > 0) {
        setLimitedOfferUseList(offersToAdd);

        // 未払い分を購入リストに追加
        if (paymentsToAdd.length > 0) {
          setTicketPurchaseList(prev => {
            const newPayments = paymentsToAdd.filter(payment =>
              !prev.find(p => p.customer_ticket_id === payment.customer_ticket_id)
            );
            return [...prev, ...newPayments];
          });
        }
      }
    }
    else if (pendingBookingDetail.limited_offer_id) {
      // ownedTicketsからis_limited: trueかつoffer_idが一致するものを探す
      const ticket = ownedTickets.find(t => 
        t.is_limited && t.limited_offer_id === pendingBookingDetail.limited_offer_id
      );
      if (ticket) {
        setLimitedOfferUseList([ticket]);

        // 未払いがある場合は購入リストに追加
        if (ticket.remaining_payment && ticket.remaining_payment > 0) {
          const ticketPayment = {
            id: `payment-${ticket.customer_ticket_id}`,
            customer_ticket_id: ticket.customer_ticket_id,
            name: ticket.plan_name,
            service_name: ticket.service_name,
            total_sessions: ticket.total_sessions,
            full_price: ticket.purchase_price,
            already_paid: ticket.purchase_price - ticket.remaining_payment,
            remaining_payment: ticket.remaining_payment,
            payment_amount: '',
            is_additional_payment: true,
            is_limited_ticket: true
          };

          setTicketPurchaseList(prev => {
            const exists = prev.find(p => p.customer_ticket_id === ticket.customer_ticket_id);
            if (exists) return prev;
            return [...prev, ticketPayment];
          });
        }
      }
    }

    // 処理が完了したらクリア
    setPendingBookingDetail(null);
  }, [ownedTickets, pendingBookingDetail, limitedOffers, ticketsLoaded]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [todayRes, servicesRes, optionsRes, ticketPlansRes, couponsRes, limitedOffersRes, staffRes] = await Promise.all([
        fetch(`/api/customers/today-bookings?date=${bookingDate}`),
        fetch('/api/services'),
        fetch('/api/options'),
        fetch('/api/ticket-plans'),
        fetch('/api/coupons'),
        fetch('/api/limited-offers'),
        fetch('/api/staff')
      ]);

      const todayData = await todayRes.json();
      const servicesData = await servicesRes.json();
      const optionsData = await optionsRes.json();
      const ticketPlansData = await ticketPlansRes.json();
      const couponsData = await couponsRes.json();
      const limitedOffersData = await limitedOffersRes.json();
      const staffData = await staffRes.json();

      setTodayBookings(todayData.data || []);
      setServices(servicesData.data || []);
      setOptions(optionsData.data || []);
      setAvailableTicketPlans(ticketPlansData.data || []);
      setCoupons(couponsData.data || []);
      setLimitedOffers(limitedOffersData.data || []);

      const activeStaff = (staffData.data || []).filter(s => s.is_active);
      setStaffList(activeStaff);
      if (activeStaff.length > 0) {
        setSelectedStaff(activeStaff[0]);
      }
    } catch (err) {
      console.error('データ取得エラー:', err);
      setError('データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 顧客検索
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      const response = await fetch(`/api/customers/search?name=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setSearchResults(data.data || []);
    } catch (err) {
      console.error('検索エラー:', err);
      setError('検索に失敗しました');
    }
  };

  // 予約から選択
  const handleSelectFromBooking = async (booking) => {

    // ★ 会計明細をリセット
    resetCheckoutDetails();

    setSelectedCustomer({
      customer_id: booking.customer_id,
      last_name: booking.last_name,
      first_name: booking.first_name,
      gender: booking.gender  // ★ 予約データに性別があれば使用
    });
    setSelectedStaff({
      staff_id: booking.staff_id,
      name: booking.staff_name
    });
    setSelectedBookingId(booking.booking_id);

    // ★ 顧客の性別とLINE連携情報を取得（予約データにない場合のため）
    try {
      const customerDetailRes = await fetch(`/api/customers/${booking.customer_id}`);
      const customerDetailData = await customerDetailRes.json();
      if (customerDetailData.success) {
        setSelectedCustomer(prev => ({
          ...prev,
          gender: customerDetailData.data.gender,
          line_user_id: customerDetailData.data.line_user_id
        }));
      }
    } catch (err) {
      console.error('顧客詳細取得エラー:', err);
    }

    // ★ 支払い済みの場合は支払い情報を取得して表示のみ
    if (booking.is_paid) {
      try {
        const paymentRes = await fetch(`/api/payments?booking_id=${booking.booking_id}`);
        const paymentData = await paymentRes.json();
        
        if (paymentData.success && paymentData.data && paymentData.data.length > 0) {
          const payment = paymentData.data[0];
          setPaidBookingInfo({
            payment_id: payment.payment_id,
            payment_date: payment.payment_date,
            service_name: payment.service_name,
            total_amount: payment.total_amount,
            payment_method: payment.payment_method,
            cash_amount: payment.cash_amount,
            card_amount: payment.card_amount,
            discount_amount: payment.discount_amount,
            options: payment.options || [],
            is_paid: true
          });
        }
      } catch (err) {
        console.error('支払い情報取得エラー:', err);
      }
      return; // 支払い済みの場合はここで終了
    }

    // ★ 支払い済み情報をクリア
    setPaidBookingInfo(null);

    try {
      const response = await fetch(`/api/bookings?id=${booking.booking_id}`);
      const data = await response.json();


      if (data.success && data.data) {
        const bookingDetail = Array.isArray(data.data) ? data.data[0] : data.data;

        // 通常サービスの処理
        if (bookingDetail.service_id) {
          const service = services.find(s => s.service_id === bookingDetail.service_id);
          if (service) {
            setSelectedMenu(service);
            setSelectedMenuType('normal');
            setTicketUseList([]);

            if (bookingDetail.options && bookingDetail.options.length > 0) {
              const optionIds = bookingDetail.options.map(opt => opt.option_id);
              const maxFreeOptions = service.free_option_choices || 0;

              if (maxFreeOptions > 0 && optionIds.length <= maxFreeOptions) {
                setSelectedFreeOptions(optionIds);
                setSelectedPaidOptions([]);
              } else if (maxFreeOptions > 0) {
                setSelectedFreeOptions(optionIds.slice(0, maxFreeOptions));
                setSelectedPaidOptions(optionIds.slice(maxFreeOptions));
              } else {
                setSelectedFreeOptions([]);
                setSelectedPaidOptions(optionIds);
              }
            }
          }
        }
        // クーポンの処理
        else if (bookingDetail.coupon_id) {
          const coupon = coupons.find(c => c.coupon_id === bookingDetail.coupon_id);
          if (coupon) {
            setSelectedMenu(coupon);
            setSelectedMenuType('coupon');
            setTicketUseList([]);

            if (bookingDetail.options && bookingDetail.options.length > 0) {
              const optionIds = bookingDetail.options.map(opt => opt.option_id);
              const maxFreeOptions = coupon.free_option_count || 0;

              if (maxFreeOptions > 0 && optionIds.length <= maxFreeOptions) {
                setSelectedFreeOptions(optionIds);
                setSelectedPaidOptions([]);
              } else if (maxFreeOptions > 0) {
                setSelectedFreeOptions(optionIds.slice(0, maxFreeOptions));
                setSelectedPaidOptions(optionIds.slice(maxFreeOptions));
              } else {
                setSelectedFreeOptions([]);
                setSelectedPaidOptions(optionIds);
              }
            }
          }
        }
        // 回数券と期間限定オファーがある場合
        else {
          const hasTickets = (bookingDetail.tickets && bookingDetail.tickets.length > 0) || bookingDetail.customer_ticket_id;
          const hasLimitedOffers = (bookingDetail.limited_offers && bookingDetail.limited_offers.length > 0) || bookingDetail.limited_offer_id;

          if (hasTickets || hasLimitedOffers) {
            // ★ 回数券または期間限定がある場合はpendingを設定
            setPendingBookingDetail(bookingDetail);
          }
        }

        // ★ 常に顧客の保有回数券とクーポンを取得
        await fetchCustomerTickets(booking.customer_id);
        await fetchAvailableCoupons(booking.customer_id);
      }
    } catch (err) {
      console.error('予約詳細取得エラー:', err);
    }
  };

  // ★ 会計明細をリセットする関数
  const resetCheckoutDetails = () => {
    setSelectedMenu(null);
    setSelectedMenuType('normal');
    setTicketUseList([]);
    setLimitedOfferUseList([]);
    setTicketPurchaseList([]);
    setSelectedFreeOptions([]);
    setSelectedPaidOptions([]);
    setDiscountAmount('');
    setPaymentMethod('cash');
    setCashAmount('');
    setCardAmount('');
    setReceivedAmount('');
    setTicketUseOnPurchase({});
    setTicketCustomPrices({});
    setUseMonitorPrice({});
    setPendingBookingDetail(null);
    setHasProcessedBooking(false);
    setTicketsLoaded(false);  // ★ 追加：ロードフラグもリセット
    setOwnedTickets([]);  // ★ 追加：回数券リストもリセット
    setPaidBookingInfo(null);  // ★ 支払い済み情報もリセット
  };

  // 顧客選択時の処理を修正
  const handleSelectCustomer = async (customer) => {
    // ★ 会計明細をリセット
    resetCheckoutDetails();

    setSelectedCustomer(customer);
    setSelectedBookingId(null);
    // 選択された顧客のみを検索結果に設定
    setSearchResults([customer]);

    // 顧客の詳細情報（性別・LINE連携含む）を取得
    try {
      const customerDetailRes = await fetch(`/api/customers/${customer.customer_id}`);
      const customerDetailData = await customerDetailRes.json();
      if (customerDetailData.success) {
        setSelectedCustomer({
          ...customer,
          gender: customerDetailData.data.gender,
          line_user_id: customerDetailData.data.line_user_id
        });
      }
    } catch (err) {
      console.error('顧客詳細取得エラー:', err);
    }

    await fetchCustomerTickets(customer.customer_id);
    await fetchAvailableCoupons(customer.customer_id);
  };

  // 顧客IDを使って、その顧客が利用可能なクーポンリストを取得する
  const fetchAvailableCoupons = async (customerId) => {
    try {
      // APIにcustomerIdを渡してクーポンを取得
      const response = await fetch(`/api/coupons?customerId=${customerId}`);
      const data = await response.json();
      if (data.success) {
        setCoupons(data.data || []);
      }
    } catch (err) {
      console.error('クーポン取得エラー:', err);
    }
  };


  // 顧客の回数券を取得
  const fetchCustomerTickets = async (customerId) => {
    setTicketsLoaded(false);  // ★ ロード開始
    try {
      const response = await fetch(`/api/customers/${customerId}/tickets`);
      const data = await response.json();
      if (data.success) {
        // statusフィルタを削除
        const activeTickets = (data.data || [])
          .filter(ticket => ticket.sessions_remaining > 0)  // ← この行を追加
          .map(ticket => {
            const service = services.find(s => s.name === ticket.service_name);
            return {
              ...ticket,
              service_free_option_choices: service?.free_option_choices || 0
            };
          });
        setOwnedTickets(activeTickets);
      }
    } catch (err) {
      console.error('回数券取得エラー:', err);
    } finally {
      setTicketsLoaded(true);  // ★ ロード完了（成功でも失敗でも）
    }
  };

  // 新規顧客登録
  const handleNewCustomerSubmit = async () => {
    setNewCustomerError('');
    
    if (!newCustomer.lastName || !newCustomer.firstName || !newCustomer.phoneNumber) {
      setNewCustomerError('姓名と電話番号は必須です');
      return;
    }

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          last_name: newCustomer.lastName,
          first_name: newCustomer.firstName,
          last_name_kana: newCustomer.lastNameKana,
          first_name_kana: newCustomer.firstNameKana,
          phone_number: newCustomer.phoneNumber,
          email: newCustomer.email,
          birth_date: newCustomer.birthDate || null,
          gender: newCustomer.gender || 'not_specified'
        })
      });

      const result = await response.json();
      //console.log('API レスポンス:', result);  // デバッグ用
      //console.log('response.ok:', response.ok);  // デバッグ用
      if (result.success) {
        const newCustomerData = {
          customer_id: result.data.customer_id,
          last_name: newCustomer.lastName,
          first_name: newCustomer.firstName
        };
        
        setShowNewCustomerModal(false);
        setNewCustomerError('');
        setNewCustomer({
          lastName: '',
          firstName: '',
          lastNameKana: '',
          firstNameKana: '',
          phoneNumber: '',
          email: '',
          birthDate: '',
          gender: 'not_specified'
        });
        setSuccess('新規顧客を登録しました');
        setTimeout(() => setSuccess(''), 3000);
        
        // 新規登録した顧客を選択
        handleSelectCustomer(newCustomerData);
      } else {
        // APIからのエラーメッセージを表示
        setNewCustomerError(result.error || '顧客登録に失敗しました');
      }
    } catch (err) {
      console.error('顧客登録エラー:', err);
      setNewCustomerError('顧客登録に失敗しました');
    }
  };

  // メニュー選択(回数券使用は複数追加、その他は単一選択)
  const handleSelectMenu = (menu, type) => {
    // 回数券使用の場合はリストに追加
    if (type === 'ticket') {
      const existingTicket = ticketUseList.find(t => t.customer_ticket_id === menu.customer_ticket_id);
      if (existingTicket) {
        setError('この回数券は既に追加されています');
        setTimeout(() => setError(''), 3000);
        return;
      }
      setTicketUseList(prev => [...prev, menu]);
      // 通常メニューをクリア
      setSelectedMenu(null);
      setSelectedMenuType('normal');
      // 未払いがある場合は購入リストに追加
      if (menu.remaining_payment > 0) {
        const ticketPayment = {
          id: `payment-${Date.now()}`,
          customer_ticket_id: menu.customer_ticket_id,
          name: menu.plan_name,
          service_name: menu.service_name,
          total_sessions: menu.total_sessions,
          full_price: menu.purchase_price,
          already_paid: menu.purchase_price - menu.remaining_payment,
          remaining_payment: menu.remaining_payment,
          payment_amount: '',
          is_additional_payment: true
        };
        setTicketPurchaseList(prev => {
          const exists = prev.find(t => t.customer_ticket_id === menu.customer_ticket_id);
          if (exists) return prev;
          return [...prev, ticketPayment];
        });
      }
      setSuccess(`${menu.plan_name}を追加しました`);
      setTimeout(() => setSuccess(''), 2000);
      return;
    }

    // ★ 期間限定回数券使用の場合（購入済みのものを使う）
    if (type === 'limited-use') {
      const existingOffer = limitedOfferUseList.find(t => t.customer_ticket_id === menu.customer_ticket_id);
      if (existingOffer) {
        setError('この期間限定回数券は既に追加されています');
        setTimeout(() => setError(''), 3000);
        return;
      }
      setLimitedOfferUseList(prev => [...prev, menu]);
      // 通常メニューをクリア
      setSelectedMenu(null);
      setSelectedMenuType('normal');
      // 未払いがある場合は購入リストに追加
      if (menu.remaining_payment > 0) {
        const ticketPayment = {
          id: `payment-${Date.now()}`,
          customer_ticket_id: menu.customer_ticket_id,
          name: menu.plan_name,
          service_name: menu.service_name,
          total_sessions: menu.total_sessions,
          full_price: menu.purchase_price,
          already_paid: menu.purchase_price - menu.remaining_payment,
          remaining_payment: menu.remaining_payment,
          payment_amount: '',
          is_additional_payment: true,
          is_limited_ticket: true  // 期間限定回数券フラグ
        };
        setTicketPurchaseList(prev => {
          const exists = prev.find(t => t.customer_ticket_id === menu.customer_ticket_id);
          if (exists) return prev;
          return [...prev, ticketPayment];
        });
      }
      setSuccess(`${menu.plan_name}を追加しました`);
      setTimeout(() => setSuccess(''), 2000);
      return;
    }

    // ★ 期間限定オファー（回数券ベース）の場合は ticketPurchaseList に追加
    if (type === 'limited' && menu.base_plan_id) {
      const alreadyAdded = ticketPurchaseList.find(t => t.offer_id === menu.offer_id);
      if (alreadyAdded) {
        setError('この期間限定オファーは既に追加されています');
        setTimeout(() => setError(''), 3000);
        return;
      }

      const ticketId = Date.now();
      const newTicket = {
        id: ticketId,
        offer_id: menu.offer_id,
        plan_id: menu.base_plan_id,
        name: menu.name,
        service_name: menu.base_service_name || menu.base_plan_name,
        total_sessions: menu.total_sessions,
        price: menu.special_price,
        original_price: menu.original_price,
        full_price: menu.special_price,
        already_paid: 0,
        payment_amount: '',
        is_limited_offer: true  // 期間限定フラグ
      };

      setTicketPurchaseList(prev => [...prev, newTicket]);
      setTicketUseOnPurchase(prev => ({ ...prev, [ticketId]: false }));

      // 通常メニュー・回数券使用をクリア
      setSelectedMenu(null);
      setSelectedMenuType('normal');
      setTicketUseList([]);

      setSuccess(`${menu.name}を追加しました`);
      setTimeout(() => setSuccess(''), 2000);
      return;
    }

    // 同じメニューをクリックしたら解除
    if (selectedMenu &&
      ((type === 'normal' && selectedMenu.service_id === menu.service_id) ||
        (type === 'coupon' && selectedMenu.coupon_id === menu.coupon_id) ||
        (type === 'limited' && selectedMenu.offer_id === menu.offer_id))) {
      setSelectedMenu(null);
      setSelectedMenuType('normal');
      setSelectedFreeOptions([]);
      setSelectedPaidOptions([]);
      setDiscountAmount('');
      setReceivedAmount('');
      setTicketPurchaseList(prev => prev.filter(t => !t.is_additional_payment));
      return;
    }

    // その他のタイプは従来通り単一選択
    setSelectedMenu(menu);
    setSelectedMenuType(type);
    setSelectedFreeOptions([]);
    setSelectedPaidOptions([]);
    setDiscountAmount('');
    setReceivedAmount('');
    // 回数券使用リストをクリア
    setTicketUseList([]);
    // 未払い分の購入リストもクリア
    setTicketPurchaseList(prev => prev.filter(t => !t.is_additional_payment));
  };

  // 回数券使用リストから削除
  const handleRemoveTicketUse = (customerTicketId) => {
    setTicketUseList(prev => prev.filter(t => t.customer_ticket_id !== customerTicketId));
    // 関連する未払い購入リストも削除
    setTicketPurchaseList(prev => prev.filter(t => t.customer_ticket_id !== customerTicketId));
  };

  // 回数券を購入リストに追加
  const handleAddTicketToPurchase = (plan) => {
    if (!selectedCustomer) {
      setError('お客様を先に選択してください');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const ticketId = Date.now();
    const newTicket = {
      id: ticketId,
      plan_id: plan.plan_id,
      name: plan.name,
      service_name: plan.service_name,
      total_sessions: plan.total_sessions,
      price: plan.price,
      full_price: plan.price,
      already_paid: 0,
      payment_amount: '',
      service_category: plan.service_category,
      service_id: plan.service_id
    };

    setTicketPurchaseList(prev => [...prev, newTicket]);

    setTicketUseOnPurchase(prev => ({
      ...prev,
      [ticketId]: false
    }));

    setSuccess(`${plan.name}を追加しました`);
    setTimeout(() => setSuccess(''), 2000);
  };

  // 回数券購入リストから削除
  const handleRemoveTicketFromPurchase = (ticketId) => {
    setTicketPurchaseList(prev => prev.filter(t => t.id !== ticketId));

    setTicketUseOnPurchase(prev => {
      const newState = { ...prev };
      delete newState[ticketId];
      return newState;
    });
  };

  // 回数券の支払い額を更新
  const handleUpdateTicketPayment = (ticketId, amount) => {
    setTicketPurchaseList(prev =>
      prev.map(t => t.id === ticketId ? { ...t, payment_amount: parseInt(amount) || '' } : t)
    );
  };
  // 価格変更ハンドラー
  const handleTicketPriceChange = (ticketId, price) => {
    setTicketCustomPrices(prev => ({
      ...prev,
      [ticketId]: parseInt(price) || 0
    }));
  };

  // オプション選択（自由選択）
  const handleToggleFreeOption = (optionId) => {
    let maxFree = 0;

    // 回数券使用リストがある場合、最初の回数券の無料オプション数を使用
    if (ticketUseList.length > 0) {
      maxFree = ticketUseList[0].service_free_option_choices || 0;
    } else if (limitedOfferUseList.length > 0) {
      maxFree = limitedOfferUseList[0].service_free_option_choices || 0;
    } else if (selectedMenuType === 'normal' && selectedMenu?.free_option_choices) {
      maxFree = selectedMenu.free_option_choices;
    } else if (selectedMenuType === 'coupon' && selectedMenu?.free_option_count) {
      maxFree = selectedMenu.free_option_count;
    }

    if (selectedFreeOptions.includes(optionId)) {
      setSelectedFreeOptions(prev => prev.filter(id => id !== optionId));
    } else {
      if (selectedFreeOptions.length < maxFree) {
        setSelectedFreeOptions(prev => [...prev, optionId]);
      } else {
        setError(`自由選択オプションは${maxFree}個までです`);
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  // オプション選択（追加）
  const handleTogglePaidOption = (optionId) => {
    if (selectedPaidOptions.includes(optionId)) {
      setSelectedPaidOptions(prev => prev.filter(id => id !== optionId));
    } else {
      setSelectedPaidOptions(prev => [...prev, optionId]);
    }
  };

  // 合計金額計算
  const calculateTotal = () => {
    let total = 0;

    // 通常メニュー・クーポン・期間限定など（selectedMenuがある場合）
    if (selectedMenu) {
      if (selectedMenuType === 'normal') {
        total += selectedMenu.price || 0;
      } else if (selectedMenuType === 'coupon') {
        total += selectedMenu.total_price || 0;
      } else if (selectedMenuType === 'limited') {
        total += selectedMenu.special_price || 0;
      }
    }

    // 回数券使用リストの合計（回数券自体は0円）
    // ※回数券使用は基本的に0円だが、念のため記載
    // ticketUseList.forEach(ticket => {
    //   total += 0; // 回数券使用は無料
    // });

    // 期間限定オファー使用リストの合計
    // ※購入済みのものを使用する場合は0円（残金はticketPurchaseListで処理）
    // limitedOfferUseList.forEach(offer => {
    //   total += 0; // 期間限定回数券使用は無料
    // });

    // 回数券購入リストの合計
    ticketPurchaseList.forEach(ticket => {
      total += (ticket.payment_amount || 0);
    });

    // 追加オプション
    selectedPaidOptions.forEach(optionId => {
      const option = options.find(o => o.option_id === optionId);
      if (option) {
        total += option.price;
      }
    });

    // 割引適用
    const discount = parseInt(discountAmount) || 0;
    total = Math.max(0, total - discount);

    return total;
  };

  // 10キーモーダル表示
  const handleShowKeypad = (target, event) => {
    const rect = event.target.getBoundingClientRect();
    setKeypadPosition({
      top: rect.bottom + window.scrollY,
      left: rect.left + (rect.width / 2) + window.scrollX,
    });
    setKeypadTarget(target);
    setShowKeypad(true);
  };

  // 10キーモーダル値変更
  const handleKeypadChange = (value) => {
    switch (keypadTarget) {
      case 'cashAmount':
        setCashAmount(value);
        break;
      case 'cardAmount':
        setCardAmount(value);
        break;
      case 'discountAmount':
        setDiscountAmount(value);
        break;
      case 'receivedAmount':
        setReceivedAmount(value);
        break;
      default:
        // 回数券カスタム価格の処理
        if (keypadTarget && keypadTarget.startsWith('ticket-price-')) {
          const ticketId = keypadTarget.replace('ticket-price-', '');
          setTicketCustomPrices(prev => ({
            ...prev,
            [ticketId]: value
          }));
        }
        // 回数券支払い金額の処理
        else if (keypadTarget && keypadTarget.startsWith('ticket-payment-')) {
          const ticketId = keypadTarget.replace('ticket-payment-', '');
          setTicketPurchaseList(prev =>
            prev.map(t =>
              t.id.toString() === ticketId
                ? { ...t, payment_amount: parseInt(value) || 0 }
                : t
            )
          );
        }
        break;
    }
  };

  // お会計処理
  const handleCheckout = async () => {
    if (!selectedCustomer) {
      setError('お客様を選択してください');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (!selectedStaff || !selectedStaff.staff_id) {
      setError('担当スタッフを選択してください');
      setTimeout(() => setError(''), 3000);
      return;
    }

    // ★ 通常の回数券購入と期間限定オファー購入を分離
    const newTicketPurchases = ticketPurchaseList.filter(t => !t.is_additional_payment && !t.is_limited_offer);
    const newLimitedOfferPurchases = ticketPurchaseList.filter(t => !t.is_additional_payment && t.is_limited_offer);
    const additionalPayments = ticketPurchaseList.filter(t => t.is_additional_payment);


    // =====================================================
    // パターン1: 回数券購入のみ または 期間限定オファー購入のみ
    // =====================================================
    const hasPurchaseOnly = (newTicketPurchases.length > 0 || newLimitedOfferPurchases.length > 0)
      && !selectedMenu && ticketUseList.length === 0 && limitedOfferUseList.length === 0;

    if (hasPurchaseOnly) {
      setIsLoading(true);
      try {
        let firstPaymentId = null;

        // 全購入の合計金額を計算（按分用）
        const totalPurchaseAmount = [...newTicketPurchases, ...newLimitedOfferPurchases]
          .reduce((sum, t) => sum + (t.payment_amount || 0), 0);

        // 通常回数券購入
        for (let i = 0; i < newTicketPurchases.length; i++) {
          const ticket = newTicketPurchases[i];
          let cashAmt = 0;
          let cardAmt = 0;

          if (paymentMethod === 'cash') {
            cashAmt = ticket.payment_amount;
          } else if (paymentMethod === 'card') {
            cardAmt = ticket.payment_amount;
          } else if (paymentMethod === 'mixed' && totalPurchaseAmount > 0) {
            const ratio = (ticket.payment_amount || 0) / totalPurchaseAmount;
            cashAmt = Math.round(parseInt(cashAmount) * ratio);
            cardAmt = Math.round(parseInt(cardAmount) * ratio);
          }

          const purchaseResponse = await fetch('/api/ticket-purchases', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customer_id: selectedCustomer.customer_id,
              plan_id: ticket.plan_id,
              purchase_price: ticketCustomPrices[ticket.id] || ticket.price,
              payment_amount: ticket.payment_amount || 0,
              payment_method: paymentMethod,
              cash_amount: cashAmt,
              card_amount: cardAmt,
              staff_id: selectedStaff.staff_id,
              use_immediately: ticketUseOnPurchase[ticket.id] || false,
              related_payment_id: firstPaymentId
            })
          });

          const result = await purchaseResponse.json();
          if (!result.success) {
            throw new Error(result.error || '回数券購入に失敗しました');
          }

          if (!firstPaymentId && result.data.payment_id) {
            firstPaymentId = result.data.payment_id;
          }
        }

        // ★ 期間限定オファー（回数券ベース）購入
        for (let i = 0; i < newLimitedOfferPurchases.length; i++) {
          const offer = newLimitedOfferPurchases[i];
          let cashAmt = 0;
          let cardAmt = 0;

          if (paymentMethod === 'cash') {
            cashAmt = offer.payment_amount;
          } else if (paymentMethod === 'card') {
            cardAmt = offer.payment_amount;
          } else if (paymentMethod === 'mixed' && totalPurchaseAmount > 0) {
            const ratio = (offer.payment_amount || 0) / totalPurchaseAmount;
            cashAmt = Math.round(parseInt(cashAmount) * ratio);
            cardAmt = Math.round(parseInt(cardAmount) * ratio);
          }

          const purchaseResponse = await fetch('/api/limited-offer-purchases', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customer_id: selectedCustomer.customer_id,
              offer_id: offer.offer_id,
              plan_id: offer.plan_id,
              purchase_price: ticketCustomPrices[offer.id] || offer.price,
              payment_amount: offer.payment_amount || 0,
              payment_method: paymentMethod,
              cash_amount: cashAmt,
              card_amount: cardAmt,
              staff_id: selectedStaff.staff_id,
              use_immediately: ticketUseOnPurchase[offer.id] || false,
              related_payment_id: firstPaymentId
            })
          });

          const result = await purchaseResponse.json();
          if (!result.success) {
            throw new Error(result.error || '期間限定オファー購入に失敗しました');
          }

          if (!firstPaymentId && result.data.payment_id) {
            firstPaymentId = result.data.payment_id;
          }
        }

        setSuccess('購入が完了しました!');

        if (firstPaymentId) {
          setCompletedPaymentId(firstPaymentId);
          setShowCheckoutComplete(true);
        }

        setTimeout(() => {
          setSuccess('');
          resetForm();
        }, 2000);
      } catch (err) {
        console.error('購入エラー:', err);
        setError(err.message);
        setTimeout(() => setError(''), 3000);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // =====================================================
    // パターン2: メニュー、回数券使用、期間限定のいずれかがある場合
    // =====================================================
    
    // ★ 残金支払いのみの場合は別処理
    const hasOnlyAdditionalPayments = additionalPayments.length > 0 
      && !selectedMenu && ticketUseList.length === 0 && limitedOfferUseList.length === 0
      && newTicketPurchases.length === 0 && newLimitedOfferPurchases.length === 0;

    if (hasOnlyAdditionalPayments) {
      // 合計金額を計算
      const totalAdditionalPayment = additionalPayments.reduce((sum, t) => sum + (t.payment_amount || 0), 0);
      
      // お預かり金額のバリデーション
      if (paymentMethod === 'cash') {
        const received = parseInt(receivedAmount) || 0;
        if (received < totalAdditionalPayment) {
          setError(`お預かり金額が不足しています（必要: ¥${totalAdditionalPayment.toLocaleString()}）`);
          setTimeout(() => setError(''), 3000);
          return;
        }
      } else if (paymentMethod === 'mixed') {
        const totalInput = (parseInt(cashAmount) || 0) + (parseInt(cardAmount) || 0);
        if (totalInput < totalAdditionalPayment) {
          setError(`支払い金額が不足しています（必要: ¥${totalAdditionalPayment.toLocaleString()}）`);
          setTimeout(() => setError(''), 3000);
          return;
        }
      }

      setIsLoading(true);
      try {
        let firstPaymentId = null;

        for (const ticket of additionalPayments) {
          if (ticket.payment_amount > 0) {
            let cashAmt = 0;
            let cardAmt = 0;

            if (paymentMethod === 'cash') {
              cashAmt = ticket.payment_amount;
            } else if (paymentMethod === 'card') {
              cardAmt = ticket.payment_amount;
            } else if (paymentMethod === 'mixed' && totalAdditionalPayment > 0) {
              const ratio = ticket.payment_amount / totalAdditionalPayment;
              cashAmt = Math.round((parseInt(cashAmount) || 0) * ratio);
              cardAmt = Math.round((parseInt(cardAmount) || 0) * ratio);
            }

            // ticket_paymentsテーブルへの記録
            await fetch('/api/ticket-purchases', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                customer_ticket_id: ticket.customer_ticket_id,
                payment_amount: ticket.payment_amount,
                payment_method: paymentMethod
              })
            });

            // paymentsテーブルへの記録（売上管理用）
            const paymentResponse = await fetch('/api/payments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                customer_id: selectedCustomer.customer_id,
                staff_id: selectedStaff.staff_id,
                payment_type: 'ticket',
                ticket_id: ticket.customer_ticket_id,
                options: [],
                discount_amount: 0,
                payment_method: paymentMethod,
                cash_amount: cashAmt,
                card_amount: cardAmt,
                payment_amount: ticket.payment_amount,
                is_remaining_payment: true,  // ★ フラグで判定
                related_payment_id: firstPaymentId
              })
            });

            const paymentResult = await paymentResponse.json();
            if (paymentResult.success && !firstPaymentId) {
              firstPaymentId = paymentResult.data.payment_id;
            }
          }
        }

        setCompletedPaymentId(firstPaymentId);
        setShowCheckoutComplete(true);
        setSuccess('残金の支払いが完了しました');
        setTimeout(() => setSuccess(''), 3000);

      } catch (err) {
        console.error('残金支払いエラー:', err);
        setError(err.message || '残金支払い処理に失敗しました');
        setTimeout(() => setError(''), 5000);
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    if (!selectedMenu && ticketUseList.length === 0 && limitedOfferUseList.length === 0
      && newTicketPurchases.length === 0 && newLimitedOfferPurchases.length === 0) {
      setError('メニューまたは回数券・期間限定を選択してください');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setIsLoading(true);
    try {
      const ticketToUse = ticketUseList.length > 0 ? ticketUseList[0] : null;
      const limitedOfferToUse = limitedOfferUseList.length > 0 ? limitedOfferUseList[0] : null;
      const ticketPaymentAmount = additionalPayments.reduce((sum, t) => sum + (t.payment_amount || 0), 0);

      // ★ 支払い金額のバリデーション
      const totalToPay = total;
      if (totalToPay > 0) {
        if (paymentMethod === 'cash') {
          const received = parseInt(receivedAmount) || 0;
          if (received < totalToPay) {
            setError(`お預かり金額が不足しています（必要: ¥${totalToPay.toLocaleString()}）`);
            setTimeout(() => setError(''), 3000);
            setIsLoading(false);
            return;
          }
        } else if (paymentMethod === 'mixed') {
          const totalInput = (parseInt(cashAmount) || 0) + (parseInt(cardAmount) || 0);
          if (totalInput < totalToPay) {
            setError(`支払い金額が不足しています（必要: ¥${totalToPay.toLocaleString()}）`);
            setTimeout(() => setError(''), 3000);
            setIsLoading(false);
            return;
          }
        }
      }

      // =====================================================
      // 1. 施術の会計処理（メインの支払い）
      // =====================================================
      const paymentData = {
        customer_id: selectedCustomer.customer_id,
        booking_id: selectedBookingId,
        staff_id: selectedStaff.staff_id,
        service_id: selectedMenuType === 'normal' ? selectedMenu?.service_id :
          (selectedMenuType === 'coupon' ? selectedMenu?.base_service_id : null),
        payment_type: ticketToUse ? 'ticket' : (limitedOfferToUse ? 'limited' : selectedMenuType),
        ticket_id: ticketToUse ? ticketToUse.customer_ticket_id : null,
        coupon_id: selectedMenuType === 'coupon' ? selectedMenu?.coupon_id : null,
        // 期間限定回数券使用時はcustomer_ticket_id（purchase_id）を送る
        limited_offer_id: limitedOfferToUse ? limitedOfferToUse.limited_offer_id : (selectedMenuType === 'limited' ? selectedMenu?.offer_id : null),
        limited_purchase_id: limitedOfferToUse ? limitedOfferToUse.customer_ticket_id : null,
        options: [
          ...selectedPaidOptions.map(id => ({ option_id: id, is_free: false })),
          ...selectedFreeOptions.map(id => ({ option_id: id, is_free: true }))
        ],
        discount_amount: parseInt(discountAmount) || 0,
        payment_method: paymentMethod,
        cash_amount: paymentMethod === 'cash' ? calculateTotal() :
          (paymentMethod === 'mixed' ? parseInt(cashAmount) || 0 : 0),
        card_amount: paymentMethod === 'card' ? calculateTotal() :
          (paymentMethod === 'mixed' ? parseInt(cardAmount) || 0 : 0),
        payment_amount: ticketPaymentAmount
      };


      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'お会計処理に失敗しました');
      }

      const mainPaymentId = result.data.payment_id;

      // =====================================================
      // 2. 2回目以降の回数券使用処理
      // =====================================================
      for (let i = 1; i < ticketUseList.length; i++) {
        const additionalTicket = ticketUseList[i];

        await fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_id: selectedCustomer.customer_id,
            staff_id: selectedStaff.staff_id,
            payment_type: 'ticket',
            ticket_id: additionalTicket.customer_ticket_id,
            options: [],
            payment_method: 'cash',
            cash_amount: 0,
            card_amount: 0,
            payment_amount: 0,
            related_payment_id: mainPaymentId
          })
        });
      }

      // =====================================================
      // 3. 2回目以降の期間限定オファー使用処理
      // =====================================================
      for (let i = 1; i < limitedOfferUseList.length; i++) {
        const additionalOffer = limitedOfferUseList[i];

        await fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_id: selectedCustomer.customer_id,
            staff_id: selectedStaff.staff_id,
            payment_type: 'limited',
            limited_offer_id: additionalOffer.limited_offer_id,
            limited_purchase_id: additionalOffer.customer_ticket_id,
            options: [],
            payment_method: 'cash',
            cash_amount: 0,
            card_amount: 0,
            payment_amount: 0,
            related_payment_id: mainPaymentId
          })
        });
      }

      // =====================================================
      // 4. 既存回数券の残金支払い処理
      // =====================================================
      for (const ticket of additionalPayments) {
        if (ticket.payment_amount > 0) {

          // 按分計算
          let cashAmt = 0;
          let cardAmt = 0;

          if (paymentMethod === 'cash') {
            cashAmt = ticket.payment_amount;
            cardAmt = 0;
          } else if (paymentMethod === 'card') {
            cashAmt = 0;
            cardAmt = ticket.payment_amount;
          } else if (paymentMethod === 'mixed') {
            const totalAdditionalPayment = additionalPayments.reduce((sum, t) => sum + (t.payment_amount || 0), 0);
            if (totalAdditionalPayment > 0) {
              const ratio = ticket.payment_amount / totalAdditionalPayment;
              cashAmt = Math.round(parseInt(cashAmount) * ratio);
              cardAmt = Math.round(parseInt(cardAmount) * ratio);
            }
          }

          // ticket_paymentsテーブルへの記録
          await fetch('/api/ticket-purchases', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customer_ticket_id: ticket.customer_ticket_id,
              payment_amount: ticket.payment_amount,
              payment_method: paymentMethod
            })
          });

          // paymentsテーブルへの記録（売上管理用）
          await fetch('/api/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customer_id: selectedCustomer.customer_id,
              staff_id: selectedStaff.staff_id,
              payment_type: 'ticket',
              ticket_id: ticket.customer_ticket_id,
              options: [],
              discount_amount: 0,
              payment_method: paymentMethod,
              cash_amount: cashAmt,
              card_amount: cardAmt,
              payment_amount: ticket.payment_amount,
              is_remaining_payment: true,  // ★ フラグで判定
              related_payment_id: mainPaymentId
            })
          });
        }
      }

      // =====================================================
      // ★★★ 5. 新規回数券購入 ★★★
      // =====================================================

      for (const ticket of newTicketPurchases) {

        let cashAmt = 0;
        let cardAmt = 0;

        if (paymentMethod === 'cash') {
          cashAmt = ticket.payment_amount || 0;
        } else if (paymentMethod === 'card') {
          cardAmt = ticket.payment_amount || 0;
        } else if (paymentMethod === 'mixed') {
          const totalNewPurchaseAmount = newTicketPurchases.reduce((sum, t) => sum + (t.payment_amount || 0), 0);
          if (totalNewPurchaseAmount > 0) {
            cashAmt = Math.round((ticket.payment_amount || 0) * (parseInt(cashAmount) / (parseInt(cashAmount) + parseInt(cardAmount) || 1)));
            cardAmt = (ticket.payment_amount || 0) - cashAmt;
          }
        }

        const purchaseRequestBody = {
          customer_id: selectedCustomer.customer_id,
          plan_id: ticket.plan_id,
          purchase_price: ticketCustomPrices[ticket.id] || ticket.price,
          payment_amount: ticket.payment_amount || 0,
          payment_method: paymentMethod,
          cash_amount: cashAmt,
          card_amount: cardAmt,
          staff_id: selectedStaff.staff_id,
          use_immediately: ticketUseOnPurchase[ticket.id] || false,
          related_payment_id: mainPaymentId
        };


        const purchaseResponse = await fetch('/api/ticket-purchases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(purchaseRequestBody)
        });

        const purchaseResult = await purchaseResponse.json();

        if (!purchaseResult.success) {
          console.error('新規回数券購入エラー:', purchaseResult.error);
          setError(`回数券購入でエラー: ${purchaseResult.error}`);
          setTimeout(() => setError(''), 5000);
        }
      }

      // =====================================================
      // ★★★ 6. 新規期間限定オファー購入 ★★★
      // =====================================================

      for (const offer of newLimitedOfferPurchases) {

        let cashAmt = 0;
        let cardAmt = 0;

        if (paymentMethod === 'cash') {
          cashAmt = offer.payment_amount || 0;
        } else if (paymentMethod === 'card') {
          cardAmt = offer.payment_amount || 0;
        } else if (paymentMethod === 'mixed') {
          const totalNewPurchaseAmount = newLimitedOfferPurchases.reduce((sum, t) => sum + (t.payment_amount || 0), 0);
          if (totalNewPurchaseAmount > 0) {
            cashAmt = Math.round((offer.payment_amount || 0) * (parseInt(cashAmount) / (parseInt(cashAmount) + parseInt(cardAmount) || 1)));
            cardAmt = (offer.payment_amount || 0) - cashAmt;
          }
        }

        const purchaseRequestBody = {
          customer_id: selectedCustomer.customer_id,
          offer_id: offer.offer_id,
          plan_id: offer.plan_id,
          purchase_price: ticketCustomPrices[offer.id] || offer.price,
          payment_amount: offer.payment_amount || 0,
          payment_method: paymentMethod,
          cash_amount: cashAmt,
          card_amount: cardAmt,
          staff_id: selectedStaff.staff_id,
          use_immediately: ticketUseOnPurchase[offer.id] || false,
          related_payment_id: mainPaymentId
        };


        const purchaseResponse = await fetch('/api/limited-offer-purchases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(purchaseRequestBody)
        });

        const purchaseResult = await purchaseResponse.json();

        if (!purchaseResult.success) {
          console.error('期間限定オファー購入エラー:', purchaseResult.error);
          setError(`期間限定オファー購入でエラー: ${purchaseResult.error}`);
          setTimeout(() => setError(''), 5000);
        }
      }

      // =====================================================
      // 完了処理
      // =====================================================
      setSuccess('お会計が完了しました!');

      // ★ 会計完了モーダルを表示
      if (mainPaymentId) {
        setCompletedPaymentId(mainPaymentId);
        setShowCheckoutComplete(true);
      }

      setTimeout(() => {
        setSuccess('');
      }, 2000);

    } catch (err) {
      console.error('お会計エラー:', err);
      setError(err.message || 'お会計処理に失敗しました');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedCustomer(null);
    setSelectedBookingId(null);
    setSelectedMenu(null);
    setTicketUseList([]);
    setLimitedOfferUseList([]); // ← 追加
    setSelectedFreeOptions([]);
    setSelectedPaidOptions([]);
    setPaymentMethod('cash');
    setCashAmount('');
    setCardAmount('');
    setDiscountAmount('');
    setReceivedAmount('');
    setOwnedTickets([]);
    setTicketPurchaseList([]);
    setTicketUseOnPurchase({});
    setTicketCustomPrices({});
    setUseMonitorPrice({});
    if (staffList.length > 0) {
      setSelectedStaff(staffList[0]);
    }
    fetchInitialData();
  };

  const total = calculateTotal();
  const change = receivedAmount ? Math.max(0, parseInt(receivedAmount) - total) : 0;

  let maxFreeOptions = 0;
  if (ticketUseList.length > 0) {
    maxFreeOptions = ticketUseList[0].service_free_option_choices || 0;
  } else if (limitedOfferUseList.length > 0) {
    maxFreeOptions = limitedOfferUseList[0].service_free_option_choices || 0;
  } else if (selectedMenuType === 'normal' && selectedMenu?.free_option_choices) {
    maxFreeOptions = selectedMenu.free_option_choices;
  } else if (selectedMenuType === 'coupon' && selectedMenu?.free_option_count) {
    maxFreeOptions = selectedMenu.free_option_count;
  }
  const handleCloseCheckoutComplete = () => {
    setShowCheckoutComplete(false);
    setCompletedPaymentId(null);
    resetForm();
  };

  return (
    <div className="register-page">
      <header className="register-page__header">
        <div className="register-page__header-container">
          <Link href="/" className="register-page__back-link">
            <ArrowLeft size={20} />
            <span>予約一覧に戻る</span>
          </Link>
          <div className="register-page__header-title">
            <CreditCard size={24} />
            <h1>ABBY レジ・お会計</h1>
          </div>
        </div>
      </header>

      <main className="register-page__main">
        {error && (
          <div className="alert alert--error">
            <AlertCircle size={20} />
            {error}
          </div>
        )}
        {success && (
          <div className="alert alert--success">
            <Check size={20} />
            {success}
          </div>
        )}

        <div className="register-page__grid">
          <div className="register-page__left">
            {/* 顧客選択 */}
            <div className="register-section">
              <div className="register-section__header">
                <Users size={18} />
                <h3 className="register-section__title">お客様選択</h3>
                <button className="new-customer-btn" onClick={() => setShowNewCustomerModal(true)}>
                  <UserPlus size={16} />
                  新規登録
                </button>
              </div>
              <div className="register-section__content">
                <div className="register-tabs">
                  <button
                    className={`register-tab ${customerTab === 'today' ? 'register-tab--active' : ''}`}
                    onClick={() => {
                      if (customerTab !== 'today') {
                        resetCheckoutDetails();
                        setSelectedCustomer(null);
                        setSelectedStaff(staffList.length > 0 ? staffList[0] : null);
                        setSelectedBookingId(null);
                      }
                      setCustomerTab('today');
                    }}
                  >
                    予約者一覧
                  </button>
                  <button
                    className={`register-tab ${customerTab === 'search' ? 'register-tab--active' : ''}`}
                    onClick={() => {
                      if (customerTab !== 'search') {
                        resetCheckoutDetails();
                        setSelectedCustomer(null);
                        setSelectedStaff(staffList.length > 0 ? staffList[0] : null);
                        setSelectedBookingId(null);
                      }
                      setCustomerTab('search');
                    }}
                  >
                    顧客検索
                  </button>
                </div>

                {customerTab === 'today' ? (
                  <>
                    {/* 日付選択 */}
                    <div style={{ marginBottom: '12px' }}>
                      <button
                        type="button"
                        onClick={() => setShowDatePicker(true)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px',
                          background: '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Calendar size={16} color="#6b7280" />
                          {(() => {
                            const d = new Date(bookingDate);
                            const today = new Date();
                            const isToday = bookingDate === today.toISOString().split('T')[0];
                            const yesterday = new Date(today);
                            yesterday.setDate(yesterday.getDate() - 1);
                            const isYesterday = bookingDate === yesterday.toISOString().split('T')[0];
                            const tomorrow = new Date(today);
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            const isTomorrow = bookingDate === tomorrow.toISOString().split('T')[0];
                            
                            const label = isToday ? '（今日）' : isYesterday ? '（昨日）' : isTomorrow ? '（明日）' : '';
                            return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${label}`;
                          })()}
                        </span>
                        <span style={{ color: '#9ca3af' }}>▼</span>
                      </button>
                    </div>
                    <div className="customer-quick-list">
                      {todayBookings.map(booking => {
                        return (
                          <div
                            key={booking.booking_id}
                            className={`customer-item ${selectedCustomer?.customer_id === booking.customer_id ? 'customer-item--selected' : ''} ${booking.is_paid ? 'customer-item--paid' : ''}`}
                            onClick={() => handleSelectFromBooking(booking)}
                          >
                            <div className="customer-item__header">
                              <div className="customer-item__name">
                                {booking.last_name} {booking.first_name} 様
                              </div>
                              {booking.is_paid && (
                                <span className="customer-item__paid-badge">会計済</span>
                              )}
                            </div>
                            <div className="customer-item__info">
                              {booking.start_time?.substring(0, 5)} - {booking.end_time?.substring(0, 5)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="search-box">
                      <input
                        type="text"
                        className="search-input"
                        placeholder="名前または電話番号で検索"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      />
                      <button className="search-btn" onClick={handleSearch}>
                        検索
                      </button>
                    </div>
                    <div className="customer-quick-list">
                      {searchResults.map(customer => (
                        <div
                          key={customer.customer_id}
                          className={`customer-item ${selectedCustomer?.customer_id === customer.customer_id ? 'customer-item--selected' : ''}`}
                          onClick={() => handleSelectCustomer(customer)}
                        >
                          <div className="customer-item__name">
                            {customer.last_name} {customer.first_name} 様
                          </div>
                          <div className="customer-item__info">
                            {customer.phone_number}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 担当スタッフ選択 */}
            <div className="register-section">
              <div className="register-section__header">
                <Users size={18} />
                <h3 className="register-section__title">担当スタッフ</h3>
              </div>
              <div className="register-section__content">
                <div className="staff-selection" style={paidBookingInfo ? { pointerEvents: 'none', opacity: 0.5 } : {}}>
                  {staffList.map(staff => (
                    <button
                      key={staff.staff_id}
                      className={`staff-btn ${selectedStaff?.staff_id === staff.staff_id ? 'staff-btn--selected' : ''}`}
                      onClick={() => !paidBookingInfo && setSelectedStaff(staff)}
                      style={{ '--staff-color': staff.color }}
                      disabled={!!paidBookingInfo}
                    >
                      <div className="staff-btn__color" style={{ backgroundColor: staff.color }}></div>
                      <div className="staff-btn__name">{staff.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* メニュー・施術選択 */}
            <div className="register-section">
              <div className="register-section__header">
                <Package size={18} />
                <h3 className="register-section__title">メニュー選択</h3>
              </div>
              <div className="register-section__content">
                <div className="register-tabs">
                  <button
                    className={`register-tab ${menuTab === 'normal' ? 'register-tab--active' : ''}`}
                    onClick={() => !paidBookingInfo && setMenuTab('normal')}
                    disabled={!!paidBookingInfo}
                  >
                    通常メニュー
                  </button>
                  <button
                    className={`register-tab ${menuTab === 'ticket-use' ? 'register-tab--active' : ''}`}
                    onClick={() => !paidBookingInfo && setMenuTab('ticket-use')}
                    disabled={!!paidBookingInfo}
                  >
                    回数券使用
                  </button>
                  <button
                    className={`register-tab ${menuTab === 'ticket-buy' ? 'register-tab--active' : ''}`}
                    onClick={() => !paidBookingInfo && setMenuTab('ticket-buy')}
                    disabled={!!paidBookingInfo}
                  >
                    回数券購入
                  </button>
                  <button
                    className={`register-tab ${menuTab === 'coupon' ? 'register-tab--active' : ''}`}
                    onClick={() => !paidBookingInfo && setMenuTab('coupon')}
                    disabled={!!paidBookingInfo}
                  >
                    クーポン
                  </button>
                  <button
                    className={`register-tab ${menuTab === 'limited' ? 'register-tab--active' : ''}`}
                    onClick={() => !paidBookingInfo && setMenuTab('limited')}
                    disabled={!!paidBookingInfo}
                  >
                    期間限定購入
                  </button>
                </div>

                {menuTab !== 'ticket-buy' && (
                  <div className="menu-grid" style={paidBookingInfo ? { pointerEvents: 'none', opacity: 0.5 } : {}}>
                    {menuTab === 'normal' && services.map(service => (
                      <div
                        key={service.service_id}
                        className={`menu-card ${selectedMenu?.service_id === service.service_id && selectedMenuType === 'normal' ? 'menu-card--selected' : ''}`}
                        onClick={() => handleSelectMenu(service, 'normal')}
                      >
                        <div className="menu-card__name">{service.name}</div>
                        <div className="menu-card__time">{service.duration_minutes}分</div>
                        <div className="menu-card__price">¥{service.price?.toLocaleString()}</div>
                        {service.free_option_choices > 0 && (
                          <div className="menu-card__badge">オプション{service.free_option_choices}個無料</div>
                        )}
                      </div>
                    ))}

                    {menuTab === 'ticket-use' && !selectedCustomer && (
                      <div className="empty-message">お客様を選択してください</div>
                    )}

                    {menuTab === 'ticket-use' && selectedCustomer && ownedTickets.length === 0 && (
                      <div className="empty-message">有効な回数券がありません</div>
                    )}

                    {menuTab === 'ticket-use' && selectedCustomer && (() => {
                      // 性別フィルタリング
                      const filteredTickets = ownedTickets.filter(ticket => {
                        // 性別が未設定の顧客は全ての回数券を表示
                        if (!selectedCustomer.gender || selectedCustomer.gender === 'not_specified') {
                          return true;
                        }
                        // プラン名に性別表記がない場合は表示
                        if (!ticket.plan_name.includes('男性') && !ticket.plan_name.includes('女性')) {
                          return true;
                        }
                        // 顧客の性別とプラン名が一致する場合のみ表示
                        if (selectedCustomer.gender === 'male' && ticket.plan_name.includes('男性')) {
                          return true;
                        }
                        if (selectedCustomer.gender === 'female' && ticket.plan_name.includes('女性')) {
                          return true;
                        }
                        return false;
                      });

                      if (filteredTickets.length === 0 && ownedTickets.length > 0) {
                        return <div className="empty-message">この顧客に該当する回数券がありません</div>;
                      }

                      return filteredTickets.map(ticket => (
                        <div
                          key={ticket.customer_ticket_id}
                          className={`menu-card ${ticketUseList.find(t => t.customer_ticket_id === ticket.customer_ticket_id) ? 'menu-card--selected' : ''} ${limitedOfferUseList.find(t => t.customer_ticket_id === ticket.customer_ticket_id) ? 'menu-card--selected' : ''}`}
                          onClick={() => handleSelectMenu(ticket, ticket.is_limited ? 'limited-use' : 'ticket')}
                        >
                          <div className="menu-card__name">
                            {ticket.is_limited && <span style={{ color: '#810af0', marginRight: '0.5rem' }}>🎁</span>}
                            {ticket.plan_name}
                          </div>
                          <div className="menu-card__info">
                            残り{ticket.sessions_remaining}回
                            {ticket.is_limited && <span style={{ color: '#810af0', marginLeft: '0.5rem' }}>（期間限定）</span>}
                          </div>
                          {ticket.remaining_payment > 0 ? (
                            <div className="menu-card__price" style={{ color: '#ef4444' }}>
                              残金: ¥{ticket.remaining_payment.toLocaleString()}
                            </div>
                          ) : (
                            <div className="menu-card__price">（回数券使用）</div>
                          )}
                        </div>
                      ));
                    })()}

                    {menuTab === 'coupon' && coupons.map(coupon => (
                      <div
                        key={coupon.coupon_id}
                        // is_selectableフラグで選択可否を判定
                        className={`menu-card ${selectedMenu?.coupon_id === coupon.coupon_id && selectedMenuType === 'coupon' ? 'menu-card--selected' : ''} ${!coupon.is_selectable ? 'menu-card--disabled' : ''}`}
                        onClick={() => coupon.is_selectable && handleSelectMenu(coupon, 'coupon')}
                      >
                        <div className="menu-card__name">{coupon.name}</div>
                        <div className="menu-card__info">{coupon.description}</div>
                        <div className="menu-card__price">¥{coupon.total_price?.toLocaleString()}</div>

                        {/* 使用不可の理由を表示 */}
                        {!coupon.is_selectable && (
                          <div className="menu-card__badge-used">
                            {coupon.usage_limit === 1 ? '使用済み' : '上限到達'}
                          </div>
                        )}
                      </div>
                    ))}

                    {menuTab === 'limited' && (() => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);

                      const filteredOffers = limitedOffers.filter(offer => {
                        // 購入期限チェック
                        if (offer.end_date) {
                          const endDate = new Date(offer.end_date);
                          endDate.setHours(23, 59, 59, 999);
                          if (endDate < today) return false;
                        }

                        // 性別チェック
                        const gender = offer.base_gender_restriction || 'all';
                        if (gender === 'all') return true;
                        if (!selectedCustomer?.gender || selectedCustomer.gender === 'not_specified') return true;
                        return gender === selectedCustomer.gender;
                      });

                      if (filteredOffers.length === 0) {
                        return <div className="empty-message">該当する期間限定オファーがありません</div>;
                      }

                      return filteredOffers.map(offer => (
                        <div
                          key={offer.offer_id}
                          className={`menu-card ${selectedMenu?.offer_id === offer.offer_id && selectedMenuType === 'limited' ? 'menu-card--selected' : ''}`}
                          onClick={() => handleSelectMenu(offer, 'limited')}
                        >
                          <div className="menu-card__name">{offer.name}</div>
                          <div className="menu-card__info">
                            購入期限: {offer.end_date ? new Date(offer.end_date).toLocaleDateString('ja-JP') : '無期限'}
                          </div>
                          <div className="menu-card__price">¥{offer.special_price?.toLocaleString()}</div>
                        </div>
                      ));
                    })()}
                  </div>
                )}

                {menuTab === 'ticket-buy' && (
                  <div className="ticket-buy-container" style={paidBookingInfo ? { pointerEvents: 'none', opacity: 0.5 } : {}}>
                    {!selectedCustomer ? (
                      <div className="empty-message">お客様を選択してください</div>
                    ) : (
                      (() => {
                        const groupedPlans = {};
                        // 性別フィルタリングを追加
                        const filteredPlans = availableTicketPlans.filter(plan => {
                          // 性別が未設定の顧客は全てのプランを表示
                          if (!selectedCustomer.gender || selectedCustomer.gender === 'not_specified') {
                            return true;
                          }
                          // プラン名に性別表記がない場合は表示
                          if (!plan.name.includes('男性') && !plan.name.includes('女性')) {
                            return true;
                          }
                          // 顧客の性別とプラン名が一致する場合のみ表示
                          if (selectedCustomer.gender === 'male' && plan.name.includes('男性')) {
                            return true;
                          }
                          if (selectedCustomer.gender === 'female' && plan.name.includes('女性')) {
                            return true;
                          }
                          return false;
                        });

                        filteredPlans.forEach(plan => {
                          const category = plan.service_category || 'その他';
                          if (!groupedPlans[category]) {
                            groupedPlans[category] = [];
                          }
                          groupedPlans[category].push(plan);
                        });

                        if (filteredPlans.length === 0) {
                          return <div className="empty-message">該当する回数券がありません</div>;
                        }

                        return Object.entries(groupedPlans).map(([category, plans]) => (
                          <div key={category} className="ticket-category-section">
                            <h5 className="ticket-category-title">{category}</h5>
                            <div className="menu-grid">
                              {plans.map(plan => (
                                <div
                                  key={plan.plan_id}
                                  className="menu-card menu-card--purchase"
                                  onClick={() => handleAddTicketToPurchase(plan)}
                                >
                                  <div className="menu-card__name">{plan.name}</div>
                                  <div className="menu-card__info">{plan.service_name} × {plan.total_sessions}回</div>
                                  <div className="menu-card__price">¥{plan.price?.toLocaleString()}</div>
                                  <div className="menu-card__badge-add">+追加</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ));
                      })()
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* オプション選択 */}
            {(selectedMenu || ticketUseList.length > 0 || limitedOfferUseList.length > 0) && menuTab !== 'ticket-buy' && menuTab !== 'limited' && (
              <div className="register-section">
                <div className="register-section__header">
                  <Sparkles size={18} />
                  <h3 className="register-section__title">オプション選択</h3>
                </div>
                <div className="register-section__content">
                  {maxFreeOptions > 0 && (
                    <>
                      <div className="option-section-label">
                        自由選択オプション（{selectedFreeOptions.length}/{maxFreeOptions}個まで無料）
                      </div>
                      <div className="option-scroll-area">
                        {['フェイシャル', 'ボディ', 'その他'].map(category => {
                          const categoryOptions = options.filter(opt => opt.is_active && opt.category === category);
                          if (categoryOptions.length === 0) return null;

                          return (
                            <div key={category} className="option-category-section">
                              <h5 className="option-category-title">{category}</h5>
                              <div className="option-grid">
                                {categoryOptions.map(option => (
                                  <div
                                    key={option.option_id}
                                    className={`option-card ${selectedFreeOptions.includes(option.option_id) ? 'option-card--selected' : ''}`}
                                    onClick={() => handleToggleFreeOption(option.option_id)}
                                  >
                                    <div className="option-card__name">{option.name}</div>
                                    <div className="option-card__time">+{option.duration_minutes}分</div>
                                    <div className="option-card__price option-card__price--free">無料</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  <div className="option-section-label" style={maxFreeOptions > 0 ? {} : { marginTop: 0 }}>
                    追加オプション（有料）
                  </div>
                  <div className="option-scroll-area">
                    {['フェイシャル', 'ボディ', 'その他'].map(category => {
                      const categoryOptions = options.filter(opt => opt.is_active && opt.category === category);
                      if (categoryOptions.length === 0) return null;

                      return (
                        <div key={category} className="option-category-section">
                          <h5 className="option-category-title">{category}</h5>
                          <div className="option-grid">
                            {categoryOptions.map(option => (
                              <div
                                key={option.option_id}
                                className={`option-card ${selectedPaidOptions.includes(option.option_id) ? 'option-card--selected' : ''}`}
                                onClick={() => handleTogglePaidOption(option.option_id)}
                              >
                                <div className="option-card__name">{option.name}</div>
                                <div className="option-card__time">+{option.duration_minutes}分</div>
                                <div className="option-card__price">+¥{option.price?.toLocaleString()}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 右側: 支払い・電卓 */}
          <div className="register-page__right">
            {/* お会計明細 */}
            <div className="register-section">
              <div className="register-section__header">
                <CreditCard size={18} />
                <h3 className="register-section__title">お会計明細</h3>
              </div>
              <div className="register-section__content">
                {selectedCustomer && (
                  <div className="customer-info-box">
                    <div className="customer-info-box__name">
                      {selectedCustomer.last_name} {selectedCustomer.first_name} 様
                    </div>
                  </div>
                )}

                {/* 支払い済みの場合の表示 */}
                {paidBookingInfo && (
                  <div className="payment-summary" style={{ background: '#f0fdf4', border: '1px solid #86efac' }}>
                    <div className="payment-summary__header" style={{ color: '#16a34a' }}>
                      <Check size={16} />
                      <span style={{ marginLeft: '8px' }}>会計済み</span>
                    </div>
                    <div className="payment-summary__item">
                      <span>メニュー</span>
                      <span>{paidBookingInfo.service_name || '-'}</span>
                    </div>
                    {paidBookingInfo.options && paidBookingInfo.options.length > 0 && (
                      <>
                        <div className="payment-summary__divider"></div>
                        <div className="payment-summary__item">
                          <span>オプション</span>
                          <span></span>
                        </div>
                        {paidBookingInfo.options.map((opt, idx) => (
                          <div key={idx} className="payment-summary__item payment-summary__item--sub">
                            <span>　{opt.option_name || opt.name}{opt.is_free ? '（無料）' : ''}</span>
                            <span>¥{opt.is_free ? '0' : (opt.price || 0).toLocaleString()}</span>
                          </div>
                        ))}
                      </>
                    )}
                    {paidBookingInfo.discount_amount > 0 && (
                      <>
                        <div className="payment-summary__divider"></div>
                        <div className="payment-summary__item payment-summary__item--discount">
                          <span>割引</span>
                          <span>-¥{paidBookingInfo.discount_amount.toLocaleString()}</span>
                        </div>
                      </>
                    )}
                    <div className="payment-summary__total">
                      <span>合計金額</span>
                      <span>¥{(paidBookingInfo.total_amount || 0).toLocaleString()}</span>
                    </div>
                    <div className="payment-summary__divider"></div>
                    <div className="payment-summary__item">
                      <span>支払方法</span>
                      <span>
                        {paidBookingInfo.payment_method === 'cash' ? '現金' :
                         paidBookingInfo.payment_method === 'card' ? 'カード' :
                         paidBookingInfo.payment_method === 'mixed' ? '現金+カード' : '-'}
                      </span>
                    </div>
                    {paidBookingInfo.payment_method === 'mixed' && (
                      <>
                        <div className="payment-summary__item payment-summary__item--sub">
                          <span>　現金</span>
                          <span>¥{(paidBookingInfo.cash_amount || 0).toLocaleString()}</span>
                        </div>
                        <div className="payment-summary__item payment-summary__item--sub">
                          <span>　カード</span>
                          <span>¥{(paidBookingInfo.card_amount || 0).toLocaleString()}</span>
                        </div>
                      </>
                    )}
                    <div className="payment-summary__item" style={{ fontSize: '12px', color: '#6b7280' }}>
                      <span>支払日時</span>
                      <span>{paidBookingInfo.payment_date ? new Date(paidBookingInfo.payment_date).toLocaleString('ja-JP') : '-'}</span>
                    </div>
                  </div>
                )}

                {selectedMenu && !paidBookingInfo && (
                  <div className="payment-summary">
                    <div className="payment-summary__item">
                      <span>メニュー</span>
                      <span>{selectedMenu.name || selectedMenu.plan_name}</span>
                    </div>
                    <div className="payment-summary__item payment-summary__item--sub">
                      <span>料金</span>
                      <span>¥{(
                        selectedMenuType === 'ticket'
                          ? 0
                          : selectedMenuType === 'coupon'
                            ? (selectedMenu.total_price || 0)
                            : selectedMenuType === 'limited'
                              ? (selectedMenu.special_price || 0)
                              : (selectedMenu.price || 0)
                      ).toLocaleString()}</span>
                    </div>

                    {selectedFreeOptions.length > 0 && (
                      <>
                        <div className="payment-summary__divider"></div>
                        <div className="payment-summary__item">
                          <span>自由選択オプション</span>
                          <span></span>
                        </div>
                        {selectedFreeOptions.map(optionId => {
                          const option = options.find(o => o.option_id === optionId);
                          return option ? (
                            <div key={optionId} className="payment-summary__item payment-summary__item--sub">
                              <span>　{option.name}</span>
                              <span>¥0</span>
                            </div>
                          ) : null;
                        })}
                      </>
                    )}

                    {selectedPaidOptions.length > 0 && (
                      <>
                        <div className="payment-summary__divider"></div>
                        <div className="payment-summary__item">
                          <span>追加オプション</span>
                          <span></span>
                        </div>
                        {selectedPaidOptions.map(optionId => {
                          const option = options.find(o => o.option_id === optionId);
                          return option ? (
                            <div key={optionId} className="payment-summary__item payment-summary__item--sub">
                              <span>　{option.name}</span>
                              <span>¥{option.price?.toLocaleString()}</span>
                            </div>
                          ) : null;
                        })}
                      </>
                    )}

                    {discountAmount && parseInt(discountAmount) > 0 && (
                      <>
                        <div className="payment-summary__divider"></div>
                        <div className="payment-summary__item payment-summary__item--discount">
                          <span>割引</span>
                          <span>-¥{parseInt(discountAmount).toLocaleString()}</span>
                        </div>
                      </>
                    )}

                    <div className="payment-summary__total">
                      <span>合計金額</span>
                      <span>¥{total.toLocaleString()}</span>
                    </div>

                    {receivedAmount && parseInt(receivedAmount) > 0 && (
                      <>
                        <div className="payment-summary__item">
                          <span>お預かり</span>
                          <span>¥{parseInt(receivedAmount).toLocaleString()}</span>
                        </div>
                        <div className="payment-summary__item payment-summary__item--change">
                          <span>おつり</span>
                          <span>¥{change.toLocaleString()}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* 回数券使用リスト（シンプル表示） */}
                {ticketUseList.length > 0 && !paidBookingInfo && (
                  <div className="payment-summary" style={{ marginTop: selectedMenu ? '1rem' : '0' }}>
                    <div className="payment-summary__header">
                      <span>回数券使用</span>
                    </div>
                    {ticketUseList.map(ticket => (
                      <div key={ticket.customer_ticket_id} className="payment-summary__item">
                        <span>{ticket.plan_name}</span>
                        <button
                          className="ticket-purchase-item__remove"
                          onClick={() => handleRemoveTicketUse(ticket.customer_ticket_id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
                        >
                          <X size={16} color="#dc2626" />
                        </button>
                      </div>
                    ))}

                    {/* 回数券使用時の無料オプション表示 */}
                    {selectedFreeOptions.length > 0 && (
                      <>
                        <div className="payment-summary__divider"></div>
                        <div className="payment-summary__item">
                          <span>自由選択オプション</span>
                          <span></span>
                        </div>
                        {selectedFreeOptions.map(optionId => {
                          const option = options.find(o => o.option_id === optionId);
                          return option ? (
                            <div key={optionId} className="payment-summary__item payment-summary__item--sub">
                              <span>　{option.name}</span>
                              <span>¥0</span>
                            </div>
                          ) : null;
                        })}
                      </>
                    )}

                    {/* 回数券使用時も合計金額を表示 */}
                    {selectedPaidOptions.length > 0 && (
                      <>
                        <div className="payment-summary__divider"></div>
                        <div className="payment-summary__item">
                          <span>追加オプション</span>
                          <span></span>
                        </div>
                        {selectedPaidOptions.map(optionId => {
                          const option = options.find(o => o.option_id === optionId);
                          return option ? (
                            <div key={optionId} className="payment-summary__item payment-summary__item--sub">
                              <span>　{option.name}</span>
                              <span>¥{option.price?.toLocaleString()}</span>
                            </div>
                          ) : null;
                        })}
                      </>
                    )}

                    <div className="payment-summary__divider"></div>
                    <div className="payment-summary__total">
                      <span>合計金額</span>
                      <span>¥{total.toLocaleString()}</span>
                    </div>

                    {receivedAmount && parseInt(receivedAmount) > 0 && (
                      <>
                        <div className="payment-summary__item">
                          <span>お預かり</span>
                          <span>¥{parseInt(receivedAmount).toLocaleString()}</span>
                        </div>
                        <div className="payment-summary__item payment-summary__item--change">
                          <span>おつり</span>
                          <span>¥{change.toLocaleString()}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
                {/* 期間限定オファー使用リスト */}
                {limitedOfferUseList.length > 0 && !paidBookingInfo && (
                  <div className="payment-summary" style={{ marginTop: '1rem' }}>
                    <div className="payment-summary__header">
                      <span>期間限定回数券使用</span>
                    </div>
                    {limitedOfferUseList.map(offer => (
                      <div key={offer.customer_ticket_id} className="payment-summary__item">
                        <span>{offer.plan_name}</span>
                        <button
                          className="ticket-purchase-item__remove"
                          onClick={() => {
                            setLimitedOfferUseList(prev => prev.filter(o => o.customer_ticket_id !== offer.customer_ticket_id));
                            // 残金支払いリストからも削除
                            setTicketPurchaseList(prev => prev.filter(t => t.customer_ticket_id !== offer.customer_ticket_id));
                          }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
                        >
                          <X size={16} color="#dc2626" />
                        </button>
                      </div>
                    ))}

                    {/* 期間限定回数券使用時の無料オプション表示 */}
                    {selectedFreeOptions.length > 0 && (
                      <>
                        <div className="payment-summary__divider"></div>
                        <div className="payment-summary__item">
                          <span>自由選択オプション</span>
                          <span></span>
                        </div>
                        {selectedFreeOptions.map(optionId => {
                          const option = options.find(o => o.option_id === optionId);
                          return option ? (
                            <div key={optionId} className="payment-summary__item payment-summary__item--sub">
                              <span>　{option.name}</span>
                              <span>¥0</span>
                            </div>
                          ) : null;
                        })}
                      </>
                    )}

                    {/* 期間限定回数券使用時の有料オプション表示 */}
                    {selectedPaidOptions.length > 0 && (
                      <>
                        <div className="payment-summary__divider"></div>
                        <div className="payment-summary__item">
                          <span>追加オプション</span>
                          <span></span>
                        </div>
                        {selectedPaidOptions.map(optionId => {
                          const option = options.find(o => o.option_id === optionId);
                          return option ? (
                            <div key={optionId} className="payment-summary__item payment-summary__item--sub">
                              <span>　{option.name}</span>
                              <span>¥{option.price?.toLocaleString()}</span>
                            </div>
                          ) : null;
                        })}
                      </>
                    )}

                    <div className="payment-summary__divider"></div>
                    <div className="payment-summary__total">
                      <span>合計金額</span>
                      <span>¥{total.toLocaleString()}</span>
                    </div>

                    {receivedAmount && parseInt(receivedAmount) > 0 && (
                      <>
                        <div className="payment-summary__item">
                          <span>お預かり</span>
                          <span>¥{parseInt(receivedAmount).toLocaleString()}</span>
                        </div>
                        <div className="payment-summary__item payment-summary__item--change">
                          <span>おつり</span>
                          <span>¥{change.toLocaleString()}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* 回数券購入リスト */}
                {ticketPurchaseList.length > 0 && !paidBookingInfo && (
                  <>
                    {/* 新規購入の回数券 */}
                    {ticketPurchaseList.filter(t => !t.is_additional_payment).length > 0 && (
                      <div className="payment-summary" style={{ marginTop: '1rem' }}>
                        <div className="payment-summary__header">
                          <span>回数券購入</span>
                        </div>
                        {ticketPurchaseList.filter(t => !t.is_additional_payment).map(ticket => (
                          <div key={ticket.id} className="ticket-purchase-item">
                            <div className="ticket-purchase-item__header">
                              <span className="ticket-purchase-item__name">{ticket.name}</span>
                              <button
                                className="ticket-purchase-item__remove"
                                onClick={() => handleRemoveTicketFromPurchase(ticket.id)}
                              >
                                <X size={16} />
                              </button>
                            </div>
                            <div className="ticket-purchase-item__info">
                              {ticket.service_name} × {ticket.total_sessions}回
                            </div>

                            {/* 価格表示部分 */}
                            <div className="ticket-pricing">
                              <div className={`original-price ${useMonitorPrice[ticket.id] ? 'original-price--strikethrough' : ''}`}>
                                定価: ¥{(ticket.price || 0).toLocaleString()}
                              </div>

                              {/* モニター価格チェックボックス */}
                              <div className="monitor-price-toggle">
                                <label className="checkbox-label">
                                  <input
                                    type="checkbox"
                                    checked={useMonitorPrice[ticket.id] || false}
                                    onChange={(e) => {
                                      setUseMonitorPrice(prev => ({
                                        ...prev,
                                        [ticket.id]: e.target.checked
                                      }));
                                      if (!e.target.checked) {
                                        setTicketCustomPrices(prev => {
                                          const newPrices = { ...prev };
                                          delete newPrices[ticket.id];
                                          return newPrices;
                                        });
                                      }
                                    }}
                                  />
                                  <span className="checkbox-text">販売価格を変更（モニター価格等）</span>
                                </label>
                              </div>

                              {/* チェックした時だけ価格入力欄を表示 */}
                              {useMonitorPrice[ticket.id] && (
                                <div className="custom-price-input">
                                  <label>販売価格:</label>
                                  <input
                                    type="number"
                                    value={ticketCustomPrices[ticket.id] || ''}
                                    onFocus={(e) => handleShowKeypad(`ticket-price-${ticket.id}`, e)}
                                    onChange={(e) => handleTicketPriceChange(ticket.id, e.target.value)}
                                    className="price-input"
                                    placeholder={(ticket.price || 0).toString()}
                                  />
                                  <span>円</span>
                                </div>
                              )}
                            </div>

                            <div className="ticket-purchase-item__use-now">
                              <label className="checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={ticketUseOnPurchase[ticket.id] || false}
                                  onChange={(e) => setTicketUseOnPurchase(prev => ({
                                    ...prev,
                                    [ticket.id]: e.target.checked
                                  }))}
                                />
                                <span className="checkbox-text">購入時に1回分使用する</span>
                              </label>
                            </div>

                            <div className="ticket-purchase-item__payment">
                              <label>今回支払額</label>
                              <input
                                type="number"
                                className="form-input"
                                value={ticket.payment_amount}
                                onFocus={(e) => handleShowKeypad(`ticket-payment-${ticket.id}`, e)}
                                onChange={(e) => handleUpdateTicketPayment(ticket.id, e.target.value)}
                                placeholder={(ticketCustomPrices[ticket.id] || ticket.price || 0).toString()}
                                max={ticketCustomPrices[ticket.id] || ticket.price || 0}
                              />
                            </div>

                            {(ticket.payment_amount || 0) < ((ticketCustomPrices[ticket.id] || ticket.price || 0)) && (
                              <div className="ticket-purchase-item__remaining">
                                残額: ¥{(((ticketCustomPrices[ticket.id] || ticket.price || 0)) - (ticket.already_paid || 0) - (ticket.payment_amount || 0)).toLocaleString()}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 未払い残高支払いの回数券 */}
                    {ticketPurchaseList.filter(t => t.is_additional_payment).length > 0 && (
                      <div className="payment-summary" style={{ marginTop: '1rem' }}>
                        <div className="payment-summary__header">
                          <span>回数券残高支払い</span>
                        </div>
                        {ticketPurchaseList.filter(t => t.is_additional_payment).map(ticket => (
                          <div key={ticket.id} className="ticket-purchase-item">
                            <div className="ticket-purchase-item__header">
                              <span className="ticket-purchase-item__name">{ticket.name}</span>
                              <button
                                className="ticket-purchase-item__remove"
                                onClick={() => {
                                  // 購入リストから削除
                                  handleRemoveTicketFromPurchase(ticket.id);
                                  // 使用リストからも削除
                                  if (ticket.customer_ticket_id) {
                                    handleRemoveTicketUse(ticket.customer_ticket_id);
                                  }
                                }}
                              >
                                <X size={16} />
                              </button>
                            </div>
                            <div className="ticket-purchase-item__info">
                              {ticket.service_name} × {ticket.total_sessions}回
                            </div>

                            {/* 未払い残高情報 */}
                            <div className="ticket-pricing">
                              <div className="payment-info-box" style={{
                                background: '#fef3c7',
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                marginBottom: '0.5rem',
                                border: '1px solid #fbbf24'
                              }}>
                                <div style={{ fontSize: '0.875rem', color: '#78350f', marginBottom: '0.25rem' }}>
                                  <strong>未払い残高</strong>
                                </div>
                                <div style={{ fontSize: '0.875rem', color: '#78350f' }}>
                                  総額: ¥{(ticket.full_price || 0).toLocaleString()}
                                </div>
                                <div style={{ fontSize: '0.875rem', color: '#78350f' }}>
                                  既払: ¥{(ticket.already_paid || 0).toLocaleString()}
                                </div>
                                <div style={{ fontSize: '0.875rem', color: '#78350f', fontWeight: 'bold', marginTop: '0.25rem' }}>
                                  残額: ¥{(ticket.remaining_payment || 0).toLocaleString()}
                                </div>
                              </div>
                            </div>

                            <div className="ticket-purchase-item__payment">
                              <label>今回支払額</label>
                              <input
                                type="number"
                                className="form-input"
                                value={ticket.payment_amount}
                                onFocus={(e) => handleShowKeypad(`ticket-payment-${ticket.id}`, e)}
                                onChange={(e) => handleUpdateTicketPayment(ticket.id, e.target.value)}
                                placeholder={(ticket.remaining_payment || 0).toString()}
                                max={ticket.remaining_payment || 0}
                              />
                            </div>

                            {(ticket.payment_amount || 0) < (ticket.remaining_payment || 0) && (
                              <div className="ticket-purchase-item__remaining">
                                今回支払後の残額: ¥{((ticket.remaining_payment || 0) - (ticket.payment_amount || 0)).toLocaleString()}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 回数券のみの場合の合計表示 */}
                    {!selectedMenu && ticketUseList.length === 0 && limitedOfferUseList.length === 0 && (
                      <div className="payment-summary__total" style={{ marginTop: '1rem', padding: '1rem', background: '#dbeafe', borderRadius: '0.5rem' }}>
                        <span>回数券購入合計</span>
                        <span>¥{total.toLocaleString()}</span>
                      </div>
                    )}
                  </>
                )}

                {/* 割引入力 */}
                {selectedMenu && selectedMenuType !== 'ticket' && selectedMenuType !== 'limited' && (
                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label>割引金額</label>
                    <input
                      type="number"
                      className="form-input"
                      value={discountAmount}
                      onFocus={(e) => handleShowKeypad('discountAmount', e)}
                      onChange={(e) => setDiscountAmount(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                )}

                {/* お預かり金額入力 */}
                {(selectedMenu || ticketPurchaseList.length > 0 || ticketUseList.length > 0 || limitedOfferUseList.length > 0) && paymentMethod === 'cash' && (
                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label>お預かり金額</label>
                    <input
                      type="number"
                      className="form-input"
                      value={receivedAmount}
                      onFocus={(e) => handleShowKeypad('receivedAmount', e)}
                      onChange={(e) => setReceivedAmount(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 支払い方法 */}
            <div className="register-section">
              <div className="register-section__header">
                <CreditCard size={18} />
                <h3 className="register-section__title">支払い方法</h3>
              </div>
              <div className="register-section__content">
                <div className="payment-method-tabs">
                  <button
                    className={`payment-tab ${paymentMethod === 'cash' ? 'payment-tab--active' : ''}`}
                    onClick={() => setPaymentMethod('cash')}
                  >
                    現金
                  </button>
                  <button
                    className={`payment-tab ${paymentMethod === 'card' ? 'payment-tab--active' : ''}`}
                    onClick={() => setPaymentMethod('card')}
                  >
                    カード
                  </button>
                  <button
                    className={`payment-tab ${paymentMethod === 'mixed' ? 'payment-tab--active' : ''}`}
                    onClick={() => setPaymentMethod('mixed')}
                  >
                    混合
                  </button>
                </div>

                {paymentMethod === 'mixed' && (
                  <div className="mixed-payment-inputs">
                    <div className="form-group">
                      <label>現金</label>
                      <input
                        type="number"
                        className="form-input"
                        value={cashAmount}
                        onFocus={(e) => handleShowKeypad('cashAmount', e)}
                        onChange={(e) => setCashAmount(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className="form-group">
                      <label>カード</label>
                      <input
                        type="number"
                        className="form-input"
                        value={cardAmount}
                        onFocus={(e) => handleShowKeypad('cardAmount', e)}
                        onChange={(e) => setCardAmount(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* お会計ボタン */}
            <button
              className="checkout-btn"
              onClick={handleCheckout}
              disabled={!selectedCustomer || (!selectedMenu && ticketPurchaseList.length === 0 && ticketUseList.length === 0 && limitedOfferUseList.length === 0) || isLoading || paidBookingInfo}
            >
              {isLoading ? '処理中...' : paidBookingInfo ? '会計済み' : 'お会計を完了する'}
            </button>
          </div>
        </div>
      </main>

      {/* 新規顧客登録モーダル */}
      {showNewCustomerModal && (
        <div className="modal-overlay" onClick={() => setShowNewCustomerModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>新規顧客登録</h3>
              <button className="modal-close" onClick={() => { setShowNewCustomerModal(false); setNewCustomerError(''); }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {newCustomerError && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={18} />
                  {newCustomerError}
                </div>
              )}
              <div className="form-group">
                <label>姓（カナ）<span className="required">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="タナカ"
                  value={newCustomer.lastNameKana}
                  onChange={(e) => setNewCustomer({ ...newCustomer, lastNameKana: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>名（カナ）<span className="required">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="ハナコ"
                  value={newCustomer.firstNameKana}
                  onChange={(e) => setNewCustomer({ ...newCustomer, firstNameKana: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>姓<span className="required">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="田中"
                  value={newCustomer.lastName}
                  onChange={(e) => setNewCustomer({ ...newCustomer, lastName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>名<span className="required">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="花子"
                  value={newCustomer.firstName}
                  onChange={(e) => setNewCustomer({ ...newCustomer, firstName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>電話番号<span className="required">*</span></label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="090-0000-0000"
                  value={newCustomer.phoneNumber}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phoneNumber: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>メールアドレス</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="example@email.com"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>生年月日</label>
                <button
                  type="button"
                  onClick={() => setShowNewCustomerBirthDatePicker(true)}
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
                  <span style={{ color: newCustomer.birthDate ? '#111827' : '#9ca3af' }}>
                    {newCustomer.birthDate
                      ? (() => {
                          const d = new Date(newCustomer.birthDate);
                          return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
                        })()
                      : '選択してください'
                    }
                  </span>
                  <span style={{ color: '#9ca3af' }}>▼</span>
                </button>
              </div>
              <div className="form-group">
                <label>性別</label>
                <select
                  className="form-input"
                  value={newCustomer.gender}
                  onChange={(e) => setNewCustomer({ ...newCustomer, gender: e.target.value })}
                >
                  <option value="not_specified">未設定</option>
                  <option value="male">男性</option>
                  <option value="female">女性</option>
                  <option value="other">その他</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-btn modal-btn--cancel" onClick={() => setShowNewCustomerModal(false)}>
                キャンセル
              </button>
              <button className="modal-btn modal-btn--primary" onClick={handleNewCustomerSubmit}>
                登録する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10キーモーダル */}
      {showKeypad && (
        <NumericKeypad
          value={
            keypadTarget === 'cashAmount' ? cashAmount :
              keypadTarget === 'cardAmount' ? cardAmount :
                keypadTarget === 'discountAmount' ? discountAmount :
                  keypadTarget === 'receivedAmount' ? receivedAmount :
                    keypadTarget && keypadTarget.startsWith('ticket-price-') ?
                      ticketCustomPrices[keypadTarget.replace('ticket-price-', '')] || '' :
                      keypadTarget && keypadTarget.startsWith('ticket-payment-') ?
                        ticketPurchaseList.find(t => t.id.toString() === keypadTarget.replace('ticket-payment-', ''))?.payment_amount?.toString() || '' :
                        ''
          }
          onChange={handleKeypadChange}
          onClose={() => setShowKeypad(false)}
          position={keypadPosition}
        />
      )}
      {/* 会計完了モーダル */}
      {showCheckoutComplete && completedPaymentId && (
        <CheckoutCompleteModal
          paymentId={completedPaymentId}
          customerId={selectedCustomer?.customer_id}
          lineConnected={!!selectedCustomer?.line_user_id}
          onClose={handleCloseCheckoutComplete}
        />
      )}

      {/* 日付スクロールピッカー */}
      <DateScrollPicker
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onConfirm={(date) => {
          if (date !== bookingDate) {
            resetCheckoutDetails();
            setSelectedCustomer(null);
            setSelectedStaff(null);
            setSelectedBookingId(null);
          }
          setBookingDate(date);
        }}
        initialDate={bookingDate}
      />

      {/* 新規顧客用 生年月日スクロールピッカー */}
      <DateScrollPicker
        isOpen={showNewCustomerBirthDatePicker}
        onClose={() => setShowNewCustomerBirthDatePicker(false)}
        onConfirm={(date) => setNewCustomer({ ...newCustomer, birthDate: date })}
        initialDate={newCustomer.birthDate || '1990-01-01'}
      />
    </div>
  );
};

export default RegisterPage;