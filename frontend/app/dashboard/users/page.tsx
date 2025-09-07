'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faSpinner, faPencilAlt, faUsers, faFilter, faUserPlus } from '@fortawesome/free-solid-svg-icons';
import { getApiUrl } from '../../utils/api';
import EditUserModal from '../../components/EditUserModal';

interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  position: string;
  position_display: string;
  department: string;
  groups: string[];
  supervisor: {
    id: number;
    username: string;
    name: string;
  } | null;
}

export default function UsersList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSecretary, setIsSecretary] = useState(false);

  useEffect(() => {
    checkUserRole();
    fetchUsers();
  }, []);

  const checkUserRole = async () => {
    try {
      const response = await fetch(getApiUrl('user-info/'), {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setIsSecretary(data.position === 'secretary');
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(getApiUrl('api/users/'), {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        console.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleAddClick = () => {
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
                      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.position_display?.toLowerCase().includes(searchTerm.toLowerCase());

    if (filter === 'all') return matchesSearch;
    return matchesSearch && user.position === filter;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 p-4 lg:p-8">
      <div className="w-full max-w-none space-y-6">
        {/* Header Section */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-r from-[#003363] to-[#D39E46] rounded-2xl flex items-center justify-center shadow-lg">
                <FontAwesomeIcon icon={faUsers} className="text-white text-2xl" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold bg-gradient-to-r from-[#003363] to-[#D39E46] bg-clip-text text-transparent mb-1">لیست کاربران</h1>
                <p className="text-gray-600 text-sm font-medium">مدیریت و جستجوی کاربران سامانه</p>
              </div>
            </div>
            {isSecretary && (
              <button
                onClick={handleAddClick}
                className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white rounded-xl shadow-lg hover:scale-105 active:scale-95 font-bold text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                <FontAwesomeIcon icon={faUserPlus} className="text-lg" />
                افزودن کاربر
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 p-6">
          <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
            <div className="relative flex-1 min-w-[220px]">
              <input
                type="text"
                placeholder="جستجو در نام، سمت یا دپارتمان..."
                className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-gray-200 focus:border-[#003363] focus:ring-2 focus:ring-[#003363]/20 focus:outline-none text-base transition-all duration-200 shadow-sm bg-white/50 backdrop-blur-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <FontAwesomeIcon
                icon={faSearch}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg"
              />
            </div>
            <div className="relative min-w-[180px]">
              <select
                className="appearance-none px-4 py-3 pr-10 rounded-xl border-2 border-gray-200 focus:border-[#003363] focus:ring-2 focus:ring-[#003363]/20 focus:outline-none bg-white/50 backdrop-blur-sm text-base transition-all duration-200 w-full shadow-sm"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">همه سمت‌ها</option>
                <option value="deputy">معاون</option>
                <option value="manager">مدیر</option>
                <option value="head">رئیس اداره</option>
                <option value="employee">کارمند</option>
                <option value="secretary">دبیر</option>
                <option value="auditor">ناظر</option>
                <option value="ceo">مدیرعامل</option>
                <option value="board">هیئت مدیره</option>
              </select>
              <FontAwesomeIcon
                icon={faFilter}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-60 gap-4">
              <div className="w-16 h-16 bg-gradient-to-r from-[#003363] to-[#D39E46] rounded-full flex items-center justify-center">
                <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-white" />
              </div>
              <span className="text-gray-600 text-lg font-medium">در حال بارگذاری کاربران...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 gap-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <FontAwesomeIcon icon={faUsers} className="text-3xl text-gray-400" />
              </div>
              <span className="text-gray-500 text-lg font-medium">هیچ کاربری یافت نشد</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-base">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50">
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider rounded-tr-xl">آواتار</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">نام کاربری</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">واحد/دپارتمان</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">سمت</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">دپارتمان</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">سرپرست</th>
                    {isSecretary && (
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider rounded-tl-xl">عملیات</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/60 transition-all duration-200 group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#003363] to-[#D39E46] flex items-center justify-center text-white font-bold text-lg shadow group-hover:scale-105 transition-transform duration-200">
                          {(user.department?.charAt(0) || user.username.charAt(0)).toUpperCase()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">{user.username}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.department || user.username}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                          {user.position_display || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.department || user.username}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          {user.supervisor?.name ? (
                            <>
                              <FontAwesomeIcon icon={faUserPlus} className="text-[#003363] w-4 h-4" />
                              {user.supervisor.name}
                            </>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </div>
                      </td>
                      {isSecretary && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleEditClick(user)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#003363] to-[#D39E46] text-white rounded-xl hover:from-[#D39E46] hover:to-[#003363] focus:outline-none focus:ring-2 focus:ring-[#003363]/20 transition-all font-bold shadow-lg hover:scale-105 active:scale-95"
                          >
                            <FontAwesomeIcon icon={faPencilAlt} className="ml-2" />
                            ویرایش
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <EditUserModal
          user={selectedUser}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedUser(null);
          }}
          onUpdate={() => {
            fetchUsers();
            setIsModalOpen(false);
            setSelectedUser(null);
          }}
        />
      </div>
    </div>
  );
} 