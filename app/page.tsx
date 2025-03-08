import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 text-gray-800 p-6 font-['Segoe UI',sans-serif]">
      <header className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text">社区答疑看板</h1>
        </div>
        
        {/* 筛选区域 */}
        <div className="bg-white/90 p-6 rounded-xl shadow-sm mb-8 transition-all duration-300 hover:shadow-md border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            {/* 技术栈筛选 */}
            <div className="flex-1">
              <h2 className="text-sm text-gray-500 mb-3 font-medium">技术栈筛选</h2>
              <div className="flex flex-wrap gap-2">
                {['React', 'Vue', 'Angular', 'Next.js', 'Node.js', 'TypeScript', 'JavaScript', 'Python', 'Java', 'Go'].map((tag) => (
                  <button 
                    key={tag} 
                    className="px-4 py-2 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-indigo-50 text-sm rounded-xl transition-all duration-300 text-gray-700 hover:text-blue-700 flex items-center hover:shadow-sm transform hover:-translate-y-0.5 border border-gray-200"
                  >
                    {tag}
                    <span className="ml-2 text-gray-400 hover:text-blue-500">×</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* 时间段筛选 */}
            <div className="min-w-[240px]">
              <h2 className="text-sm text-gray-500 mb-3 font-medium">时间段筛选</h2>
              <select className="w-full p-2.5 border border-gray-200 rounded-xl bg-white/90 shadow-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-300 hover:shadow">
                <option value="today">今日</option>
                <option value="week">本周</option>
                <option value="month" selected>本月</option>
                <option value="quarter">本季度</option>
                <option value="year">本年度</option>
                <option value="custom">自定义...</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        {/* 核心指标 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Issue Open 数', value: '42', change: '+8%', icon: 'issue' },
            { label: '48h响应率', value: '94%', change: '+2%', icon: 'response' },
            { label: '文档反馈数', value: '128', change: '+15%', icon: 'feedback' },
            { label: '文档反馈解决率', value: '78%', change: '-3%', icon: 'resolution' },
          ].map((stat, i) => (
            <div 
              key={i} 
              className="bg-white/90 p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 transform hover:-translate-y-1 hover:bg-gradient-to-br hover:from-white hover:to-gray-50"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-500 text-sm font-medium">{stat.label}</p>
                  <p className="text-3xl font-medium text-gray-800 my-2">{stat.value}</p>
                  <p className={`text-xs flex items-center gap-1 ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.change.startsWith('+') ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1v-5a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586l-4.293-4.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
                      </svg>
                    )}
                    {stat.change} (较上期)
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${
                  i === 0 ? 'bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600' : 
                  i === 1 ? 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600' : 
                  i === 2 ? 'bg-gradient-to-br from-amber-50 to-amber-100 text-amber-600' : 
                  'bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600'
                } shadow-sm transition-all duration-300 hover:shadow`}>
                  {stat.icon === 'issue' && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {stat.icon === 'response' && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {stat.icon === 'feedback' && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  )}
                  {stat.icon === 'resolution' && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tab 分组：Issue 明细和文档反馈明细 */}
        <div className="bg-white/90 rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md border border-gray-100">
          {/* Tab 头部 */}
          <div className="flex border-b border-gray-200 px-2 pt-2">
            <button className="px-6 py-3 text-blue-600 bg-blue-50 rounded-t-xl font-medium border-b-2 border-blue-500 transition-all duration-300 hover:bg-blue-100">
              Issue 明细
            </button>
            <button className="px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-t-xl transition-all duration-300">
              文档反馈明细
            </button>
          </div>

          {/* Tab 内容 - Issue 明细表格 */}
          <div className="p-6">
            <div className="overflow-x-auto rounded-xl">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Issue
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      标签
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      优先级
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      创建时间
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[
                    { title: '无法在移动设备上正确加载样式', tags: ['CSS', 'Mobile'], priority: '高', status: '待处理', time: '2小时前' },
                    { title: 'API调用返回404错误', tags: ['Backend', 'API'], priority: '中', status: '处理中', time: '5小时前' },
                    { title: '组件渲染性能问题', tags: ['React', 'Performance'], priority: '高', status: '待处理', time: '1天前' },
                    { title: '登录功能间歇性失败', tags: ['Auth', 'Frontend'], priority: '高', status: '处理中', time: '2天前' },
                    { title: '文档中的代码示例过时', tags: ['Docs'], priority: '低', status: '已解决', time: '3天前' },
                  ].map((issue, index) => (
                    <tr key={index} className="hover:bg-blue-50 transition-colors duration-200 cursor-pointer">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {issue.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {issue.tags.map((tag) => (
                            <span key={tag} className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-medium bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-100">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-medium ${
                          issue.priority === '高' ? 'bg-gradient-to-r from-red-50 to-red-100 text-red-700 border border-red-200' : 
                          issue.priority === '中' ? 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 border border-amber-200' : 
                          'bg-gradient-to-r from-green-50 to-green-100 text-green-700 border border-green-200'
                        }`}>
                          {issue.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-medium ${
                          issue.status === '待处理' ? 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border border-gray-200' : 
                          issue.status === '处理中' ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border border-blue-200' : 
                          'bg-gradient-to-r from-green-50 to-green-100 text-green-700 border border-green-200'
                        }`}>
                          {issue.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {issue.time}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4">
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    显示第 <span className="font-medium">1</span> 到 <span className="font-medium">5</span> 条，共 <span className="font-medium">42</span> 条结果
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-xl shadow-sm -space-x-px overflow-hidden" aria-label="Pagination">
                    <a href="#" className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-blue-50 transition-colors duration-200">
                      <span className="sr-only">上一页</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </a>
                    <a href="#" className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-blue-50 transition-colors duration-200">
                      1
                    </a>
                    <a href="#" className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-blue-50 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors duration-200">
                      2
                    </a>
                    <a href="#" className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-blue-50 transition-colors duration-200">
                      3
                    </a>
                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                      ...
                    </span>
                    <a href="#" className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-blue-50 transition-colors duration-200">
                      8
                    </a>
                    <a href="#" className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-blue-50 transition-colors duration-200">
                      <span className="sr-only">下一页</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </a>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
