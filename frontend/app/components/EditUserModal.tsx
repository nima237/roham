import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSpinner, faUser, faEnvelope, faBriefcase, faBuilding, faUserTie, faKey } from '@fortawesome/free-solid-svg-icons';
import { getApiUrl } from '../utils/api';

interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  position: string;
  position_display: string;
  department: string;
  supervisor: {
    id: number;
    username: string;
    name: string;
  } | null;
}

interface EditUserModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function EditUserModal({ user, isOpen, onClose, onUpdate }: EditUserModalProps) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    email: '',
    position: '',
    department: '',
    supervisor: null as number | null,
  });
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        password: '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        position: user.position || '',
        department: user.department || '',
        supervisor: user.supervisor?.id || null,
      });
    } else {
      // Reset form for new user
      setFormData({
        username: '',
        password: '',
        first_name: '',
        last_name: '',
        email: '',
        position: '',
        department: '',
        supervisor: null,
      });
    }
    fetchUsers();
  }, [user]);

  const fetchUsers = async () => {
    try {
      const response = await fetch(getApiUrl('users/'), {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = user 
        ? getApiUrl(`api/users/${user.id}/edit/`)
        : getApiUrl('api/users/create/');
      
      const response = await fetch(url, {
        method: user ? 'PUT' : 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onUpdate();
        onClose();
      } else {
        const data = await response.json();
        setError(data.error || 'خطا در ذخیره اطلاعات کاربر');
      }
    } catch (error) {
      setError('خطا در ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl mx-4 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-l from-blue-600 to-blue-800 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center">
            <FontAwesomeIcon icon={faUser} className="ml-2" />
            {user ? 'ویرایش اطلاعات کاربر' : 'افزودن کاربر جدید'}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 focus:outline-none transition duration-150"
          >
            <FontAwesomeIcon icon={faTimes} className="text-xl" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="bg-red-100 border-r-4 border-red-500 text-red-700 p-4 mb-6 rounded-lg">
              <p className="font-bold">خطا</p>
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Authentication Information */}
            {!user && (
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <FontAwesomeIcon icon={faKey} className="ml-2 text-blue-600" />
                  اطلاعات ورود
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-2">
                      <FontAwesomeIcon icon={faUser} className="ml-2 text-gray-600" />
                      نام کاربری
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none transition duration-150 text-black font-semibold placeholder-gray-500"
                      placeholder="نام کاربری"
                      required={!user}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-2">
                      <FontAwesomeIcon icon={faKey} className="ml-2 text-gray-600" />
                      رمز عبور
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none transition duration-150 text-black font-semibold placeholder-gray-500"
                      placeholder="رمز عبور"
                      required={!user}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Basic Information */}
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <FontAwesomeIcon icon={faUser} className="ml-2 text-blue-600" />
                اطلاعات پایه
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    <FontAwesomeIcon icon={faUser} className="ml-2 text-gray-600" />
                    نام
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none transition duration-150 text-black font-semibold placeholder-gray-500"
                    placeholder="نام کاربر"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    <FontAwesomeIcon icon={faUser} className="ml-2 text-gray-600" />
                    نام خانوادگی
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none transition duration-150 text-black font-semibold placeholder-gray-500"
                    placeholder="نام خانوادگی کاربر"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    <FontAwesomeIcon icon={faEnvelope} className="ml-2 text-gray-600" />
                    ایمیل
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none transition duration-150 text-black font-semibold placeholder-gray-500"
                    placeholder="example@domain.com"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            {/* Organizational Information */}
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <FontAwesomeIcon icon={faBuilding} className="ml-2 text-blue-600" />
                اطلاعات سازمانی
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    <FontAwesomeIcon icon={faBriefcase} className="ml-2 text-gray-600" />
                    سمت
                  </label>
                  <select
                    value={formData.position}
                    onChange={(e) => setFormData({...formData, position: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none transition duration-150 text-black font-semibold placeholder-gray-500"
                  >
                    <option value="">انتخاب کنید</option>
                    <option value="deputy">معاون</option>
                    <option value="manager">مدیر</option>
                    <option value="head">رئیس اداره</option>
                    <option value="employee">کارمند</option>
                    <option value="secretary">دبیر</option>
                    <option value="auditor">ناظر</option>
                    <option value="ceo">مدیرعامل</option>
                    <option value="board">هیئت مدیره</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    <FontAwesomeIcon icon={faBuilding} className="ml-2 text-gray-600" />
                    دپارتمان
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none transition duration-150 text-black font-semibold placeholder-gray-500"
                    placeholder="نام دپارتمان"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    <FontAwesomeIcon icon={faUserTie} className="ml-2 text-gray-600" />
                    سرپرست
                  </label>
                  <select
                    value={formData.supervisor || ''}
                    onChange={(e) => setFormData({...formData, supervisor: e.target.value ? parseInt(e.target.value) : null})}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none transition duration-150 text-black font-semibold placeholder-gray-500"
                  >
                    <option value="">بدون سرپرست</option>
                    {users.map((u) => (
                      u.id !== user?.id && (
                        <option key={u.id} value={u.id}>
                          {u.department || u.username} ({u.position_display})
                        </option>
                      )
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-4 border-t border-gray-200 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border-2 border-gray-300 rounded-lg shadow-sm text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ml-4"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-gradient-to-l from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition duration-150 flex items-center"
              >
                {loading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin className="ml-2" />
                    در حال ذخیره...
                  </>
                ) : (
                  user ? 'ذخیره تغییرات' : 'افزودن کاربر'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 