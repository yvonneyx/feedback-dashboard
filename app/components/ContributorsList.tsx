'use client';

import { Avatar, Table, Tag, Tooltip } from 'antd';
import { useSnapshot } from 'valtio';
import { Contributor, contributorsStore } from '../store/contributorsStore';

export default function ContributorsList() {
  const { contributors, loading } = useSnapshot(contributorsStore);

  if (!contributors || contributors.length === 0) {
    return null;
  }

  // 表格列定义
  const columns: any = [
    {
      title: '贡献者',
      dataIndex: 'login',
      key: 'login',
      width: 250,
      render: (login: string, record: Contributor) => (
        <a
          href={record.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center"
        >
          <Avatar src={record.avatar_url} size="small" className="mr-2" />
          <span>{login}</span>
          {record.is_maintainer && (
            <Tag color="gold" className="ml-2">
              维护者
            </Tag>
          )}
        </a>
      ),
    },
    {
      title: '贡献次数',
      dataIndex: 'contributions',
      key: 'contributions',
      width: 120,
      sorter: (a: Contributor, b: Contributor) => a.contributions - b.contributions,
      render: (contributions: number) => <span className="font-medium">{contributions}</span>,
    },
    {
      title: 'PR数量',
      dataIndex: 'pull_requests',
      key: 'pull_requests',
      width: 120,
      sorter: (a: Contributor, b: Contributor) => (a.pull_requests || 0) - (b.pull_requests || 0),
      render: (pull_requests: number) => <span className="font-medium">{pull_requests || 0}</span>,
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      filters: [
        { text: '所有者', value: 'OWNER' },
        { text: '成员', value: 'MEMBER' },
        { text: '协作者', value: 'COLLABORATOR' },
        { text: '贡献者', value: 'CONTRIBUTOR' },
      ],
      onFilter: (value: string, record: Contributor) => record.role === value,
      render: (role: string) => {
        let color = '';
        let displayRole = '';

        switch (role) {
          case 'OWNER':
            color = 'red';
            displayRole = '所有者';
            break;
          case 'MEMBER':
            color = 'gold';
            displayRole = '成员';
            break;
          case 'COLLABORATOR':
            color = 'blue';
            displayRole = '协作者';
            break;
          case 'CONTRIBUTOR':
            color = 'green';
            displayRole = '贡献者';
            break;
          default:
            color = 'default';
            displayRole = '贡献者';
        }

        return <Tag color={color}>{displayRole}</Tag>;
      },
    },
    {
      title: '参与项目',
      dataIndex: 'repos',
      key: 'repos',
      render: (repos: string[]) => (
        <div>
          {repos.map(repo => {
            const repoName = repo.split('/').pop() || repo;
            return (
              <Tooltip title={repo} key={repo}>
                <Tag className="mb-1 mr-1">{repoName.toUpperCase()}</Tag>
              </Tooltip>
            );
          })}
        </div>
      ),
      filters: [
        { text: 'G', value: 'antvis/g' },
        { text: 'G2', value: 'antvis/g2' },
        { text: 'S2', value: 'antvis/s2' },
        { text: 'F2', value: 'antvis/f2' },
        { text: 'G6', value: 'antvis/g6' },
        { text: 'X6', value: 'antvis/x6' },
        { text: 'L7', value: 'antvis/l7' },
        { text: 'AVA', value: 'antvis/AVA' },
        { text: 'Charts', value: 'ant-design/ant-design-charts' },
      ],
      onFilter: (value: string, record: Contributor) => record.repos.includes(value),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">贡献者列表</h3>
        <span className="text-gray-500">共 {contributors.length} 人</span>
      </div>

      <Table
        dataSource={contributors}
        columns={columns}
        rowKey="login"
        loading={loading}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: total => `共 ${total} 条记录`,
        }}
      />
    </div>
  );
}
