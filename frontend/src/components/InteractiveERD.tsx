import React, { useState } from 'react';
import { Database, Link2, Key, ChevronDown, ChevronRight, FileCode, Check, Copy } from 'lucide-react';
import { Alert, Button, PageHeader } from '../ui';

interface DBTable {
  name: string;
  description: string;
  columns: {
    name: string;
    type: string;
    key?: 'PK' | 'FK';
    refTable?: string;
    nullable: boolean;
  }[];
}

const DB_TABLES: DBTable[] = [
  {
    name: 'users',
    description: 'Stores authenticating institutional accounts.',
    columns: [
      { name: 'id', type: 'VARCHAR(36)', key: 'PK', nullable: false },
      { name: 'email', type: 'VARCHAR(150)', nullable: false },
      { name: 'password_hash', type: 'VARCHAR(255)', nullable: false },
      { name: 'name', type: 'VARCHAR(150)', nullable: false },
      { name: 'role_id', type: 'VARCHAR(36)', key: 'FK', refTable: 'roles', nullable: false },
      { name: 'phone', type: 'VARCHAR(20)', nullable: true },
      { name: 'avatar', type: 'VARCHAR(255)', nullable: true },
      { name: 'status', type: "ENUM('pending', 'active', 'suspended')", nullable: false },
      { name: 'registered_at', type: 'DATETIME', nullable: false }
    ]
  },
  {
    name: 'roles',
    description: 'Defines permission models for student, adviser, coordinator, panelist, admin.',
    columns: [
      { name: 'id', type: 'VARCHAR(36)', key: 'PK', nullable: false },
      { name: 'role_name', type: 'VARCHAR(50)', nullable: false },
      { name: 'description', type: 'VARCHAR(255)', nullable: true }
    ]
  },
  {
    name: 'students',
    description: 'Extends users with course, group team and status tracking.',
    columns: [
      { name: 'id', type: 'VARCHAR(36)', key: 'PK', nullable: false },
      { name: 'user_id', type: 'VARCHAR(36)', key: 'FK', refTable: 'users', nullable: false },
      { name: 'course_id', type: 'VARCHAR(36)', key: 'FK', refTable: 'courses', nullable: false },
      { name: 'current_sy_id', type: 'VARCHAR(36)', key: 'FK', refTable: 'school_years', nullable: false },
      { name: 'status', type: 'VARCHAR(50)', nullable: false }
    ]
  },
  {
    name: 'advisers',
    description: 'Faculty members authorized to guide research groups.',
    columns: [
      { name: 'id', type: 'VARCHAR(36)', key: 'PK', nullable: false },
      { name: 'user_id', type: 'VARCHAR(36)', key: 'FK', refTable: 'users', nullable: false },
      { name: 'department_id', type: 'VARCHAR(36)', key: 'FK', refTable: 'departments', nullable: false },
      { name: 'specialization', type: 'VARCHAR(255)', nullable: true },
      { name: 'max_load', type: 'INT', nullable: false }
    ]
  },
  {
    name: 'panelists',
    description: 'Faculty members authorized to critique and evaluate research.',
    columns: [
      { name: 'id', type: 'VARCHAR(36)', key: 'PK', nullable: false },
      { name: 'user_id', type: 'VARCHAR(36)', key: 'FK', refTable: 'users', nullable: false },
      { name: 'department_id', type: 'VARCHAR(36)', key: 'FK', refTable: 'departments', nullable: false },
      { name: 'qualification', type: 'VARCHAR(150)', nullable: true }
    ]
  },
  {
    name: 'research',
    description: 'Core research record representing title proposals and active manuscripts.',
    columns: [
      { name: 'id', type: 'VARCHAR(36)', key: 'PK', nullable: false },
      { name: 'title', type: 'VARCHAR(255)', nullable: false },
      { name: 'abstract', type: 'TEXT', nullable: true },
      { name: 'department_id', type: 'VARCHAR(36)', key: 'FK', refTable: 'departments', nullable: false },
      { name: 'course_id', type: 'VARCHAR(36)', key: 'FK', refTable: 'courses', nullable: false },
      { name: 'school_year_id', type: 'VARCHAR(36)', key: 'FK', refTable: 'school_years', nullable: false },
      { name: 'status', type: 'VARCHAR(50)', nullable: false },
      { name: 'adviser_id', type: 'VARCHAR(36)', key: 'FK', refTable: 'users', nullable: true },
      { name: 'created_at', type: 'DATETIME', nullable: false },
      { name: 'updated_at', type: 'DATETIME', nullable: false },
      { name: 'view_count', type: 'INT', nullable: false },
      { name: 'download_count', type: 'INT', nullable: false }
    ]
  },
  {
    name: 'research_versions',
    description: 'Version tree tracking document revisions, files, and chapter statuses.',
    columns: [
      { name: 'id', type: 'VARCHAR(36)', key: 'PK', nullable: false },
      { name: 'research_id', type: 'VARCHAR(36)', key: 'FK', refTable: 'research', nullable: false },
      { name: 'version_number', type: 'INT', nullable: false },
      { name: 'file_path', type: 'VARCHAR(255)', nullable: false },
      { name: 'file_name', type: 'VARCHAR(255)', nullable: false },
      { name: 'submitted_by', type: 'VARCHAR(36)', key: 'FK', refTable: 'users', nullable: false },
      { name: 'submitted_at', type: 'DATETIME', nullable: false },
      { name: 'annotated_file_path', type: 'VARCHAR(255)', nullable: true },
      { name: 'chapter_statuses_json', type: 'JSON', nullable: false }
    ]
  },
  {
    name: 'comments',
    description: 'Chapter-specific reviews logged by advisers.',
    columns: [
      { name: 'id', type: 'VARCHAR(36)', key: 'PK', nullable: false },
      { name: 'research_id', type: 'VARCHAR(36)', key: 'FK', refTable: 'research', nullable: false },
      { name: 'version_id', type: 'VARCHAR(36)', key: 'FK', refTable: 'research_versions', nullable: false },
      { name: 'author_id', type: 'VARCHAR(36)', key: 'FK', refTable: 'users', nullable: false },
      { name: 'chapter', type: "VARCHAR(50)", nullable: false },
      { name: 'text', type: 'TEXT', nullable: false },
      { name: 'comment_at', type: 'DATETIME', nullable: false },
      { name: 'resolved', type: 'TINYINT(1)', nullable: false }
    ]
  },
  {
    name: 'schedules',
    description: 'Schedules for proposal and final research defenses.',
    columns: [
      { name: 'id', type: 'VARCHAR(36)', key: 'PK', nullable: false },
      { name: 'research_id', type: 'VARCHAR(36)', key: 'FK', refTable: 'research', nullable: false },
      { name: 'date', type: 'DATE', nullable: false },
      { name: 'start_time', type: 'TIME', nullable: false },
      { name: 'end_time', type: 'TIME', nullable: false },
      { name: 'room_id', type: 'VARCHAR(36)', key: 'FK', refTable: 'rooms', nullable: false },
      { name: 'status', type: "ENUM('scheduled', 'completed', 'cancelled')", nullable: false },
      { name: 'type', type: "ENUM('proposal', 'final')", nullable: false }
    ]
  },
  {
    name: 'evaluations',
    description: 'Individual scoring grids submitted by assigned panelists.',
    columns: [
      { name: 'id', type: 'VARCHAR(36)', key: 'PK', nullable: false },
      { name: 'schedule_id', type: 'VARCHAR(36)', key: 'FK', refTable: 'schedules', nullable: false },
      { name: 'panelist_id', type: 'VARCHAR(36)', key: 'FK', refTable: 'users', nullable: false },
      { name: 'score_1', type: 'INT', nullable: false },
      { name: 'score_2', type: 'INT', nullable: false },
      { name: 'score_3', type: 'INT', nullable: false },
      { name: 'score_4', type: 'INT', nullable: false },
      { name: 'total_score', type: 'INT', nullable: false },
      { name: 'comment', type: 'TEXT', nullable: true },
      { name: 'recommendation', type: "ENUM('Passed', 'Minor Revision', 'Major Revision', 'Failed')", nullable: false },
      { name: 'evaluated_at', type: 'DATETIME', nullable: false }
    ]
  },
  {
    name: 'rooms',
    description: 'Classrooms and AVRs scheduled for defenses.',
    columns: [
      { name: 'id', type: 'VARCHAR(36)', key: 'PK', nullable: false },
      { name: 'name', type: 'VARCHAR(100)', nullable: false },
      { name: 'location', type: 'VARCHAR(255)', nullable: true },
      { name: 'capacity', type: 'INT', nullable: false }
    ]
  },
  {
    name: 'panel_availability',
    description: 'Days and hour preferences for panels to prevent automated schedule overlaps.',
    columns: [
      { name: 'id', type: 'VARCHAR(36)', key: 'PK', nullable: false },
      { name: 'panelist_id', type: 'VARCHAR(36)', key: 'FK', refTable: 'users', nullable: false },
      { name: 'day_of_week', type: 'VARCHAR(20)', nullable: false },
      { name: 'start_time', type: 'TIME', nullable: false },
      { name: 'end_time', type: 'TIME', nullable: false },
      { name: 'is_available', type: 'TINYINT(1)', nullable: false }
    ]
  },
  {
    name: 'consultations',
    description: 'Adviser consultation scheduling and logs.',
    columns: [
      { name: 'id', type: 'VARCHAR(36)', key: 'PK', nullable: false },
      { name: 'adviser_id', type: 'VARCHAR(36)', key: 'FK', refTable: 'users', nullable: false },
      { name: 'student_id', type: 'VARCHAR(36)', key: 'FK', refTable: 'users', nullable: false },
      { name: 'date_time', type: 'DATETIME', nullable: false },
      { name: 'topic', type: 'VARCHAR(255)', nullable: false },
      { name: 'status', type: "ENUM('pending', 'approved', 'completed', 'cancelled')", nullable: false },
      { name: 'meet_link', type: 'VARCHAR(255)', nullable: true }
    ]
  },
  {
    name: 'audit_logs',
    description: 'Detailed immutable logs of all operations for compliance and integrity.',
    columns: [
      { name: 'id', type: 'VARCHAR(36)', key: 'PK', nullable: false },
      { name: 'user_id', type: 'VARCHAR(36)', key: 'FK', refTable: 'users', nullable: true },
      { name: 'action', type: 'VARCHAR(100)', nullable: false },
      { name: 'ip_address', type: 'VARCHAR(45)', nullable: false },
      { name: 'details', type: 'TEXT', nullable: false },
      { name: 'created_at', type: 'DATETIME', nullable: false }
    ]
  }
];

export default function InteractiveERD() {
  const [selectedTable, setSelectedTable] = useState<string | null>('research');
  const [copied, setCopied] = useState(false);
  const [showSQL, setShowSQL] = useState(false);

  // Generate mock MySQL DDL script
  const generateMySQLDDL = (): string => {
    let ddl = `-- Northern Mindanao Colleges, Inc. (NORMI)\n`;
    ddl += `-- Research Management & Monitoring System Database Schema\n`;
    ddl += `-- Generated for MySQL 8.0+ / MariaDB\n\n`;
    ddl += `CREATE DATABASE IF NOT EXISTS normi_research_db;\n`;
    ddl += `USE normi_research_db;\n\n`;

    DB_TABLES.forEach(table => {
      ddl += `CREATE TABLE \`${table.name}\` (\n`;
      const colDefs = table.columns.map(col => {
        let def = `  \`${col.name}\` ${col.type}`;
        if (!col.nullable) def += ` NOT NULL`;
        if (col.key === 'PK') def += ` AUTO_INCREMENT`; // simplfied or standard
        return def;
      });

      // PK definition
      const pkCol = table.columns.find(col => col.key === 'PK');
      if (pkCol) {
        colDefs.push(`  PRIMARY KEY (\`${pkCol.name}\`)`);
      }

      // FK definition
      table.columns.forEach(col => {
        if (col.key === 'FK' && col.refTable) {
          colDefs.push(`  CONSTRAINT \`fk_${table.name}_${col.name}\` FOREIGN KEY (\`${col.name}\`) REFERENCES \`${col.refTable}\` (\`id\`) ON DELETE CASCADE`);
        }
      });

      ddl += colDefs.join(',\n');
      ddl += `\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;
    });
    return ddl;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateMySQLDDL());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getActiveConnections = (tableName: string) => {
    const table = DB_TABLES.find(t => t.name === tableName);
    if (!table) return [];
    
    const refs: string[] = [];
    // Incoming relations
    table.columns.forEach(c => {
      if (c.key === 'FK' && c.refTable) refs.push(c.refTable);
    });
    // Outgoing relations (others pointing here)
    DB_TABLES.forEach(t => {
      t.columns.forEach(c => {
        if (c.key === 'FK' && c.refTable === tableName) {
          refs.push(t.name);
        }
      });
    });
    return Array.from(new Set(refs));
  };

  const highlightedConnections = selectedTable ? getActiveConnections(selectedTable) : [];

  return (
    <div className="space-y-6" id="erd-container">
      <PageHeader
        title="Database Diagram"
        subtitle="A picture of how the system’s information is organised. Select a table to see what it holds and how it connects to other tables."
        action={
          <Button variant="secondary" icon={FileCode} aria-pressed={showSQL} onClick={() => setShowSQL(!showSQL)}>
            {showSQL ? 'Show the Diagram' : 'Show the SQL Script'}
          </Button>
        }
      />

      <Alert tone="info" title="This page is for developers">
        This is a planned MySQL-style diagram used for documentation. The running system keeps its data in MongoDB,
        so the tables and fields here may not match exactly.
      </Alert>

      {showSQL ? (
        <div className="bg-slate-900 rounded-xl overflow-hidden shadow-sm border border-slate-800">
          <div className="bg-slate-850 px-4 py-2 border-b border-slate-800 flex justify-between items-center">
            <span className="text-xs text-slate-500 font-mono">normi_research_schema.sql</span>
            <button
              onClick={copyToClipboard}
              className="px-3 py-2 text-xs text-slate-200 hover:text-white flex items-center gap-1 hover:bg-slate-800 rounded transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-green-400" />
                  <span className="text-green-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copy Script</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-4 overflow-x-auto text-xs text-slate-300 font-mono leading-relaxed max-h-96">
            <code>{generateMySQLDDL()}</code>
          </pre>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Table List / Diagram Canvas */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 relative min-h-[480px] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded border text-xs text-slate-500 flex items-center gap-2 z-10 shadow-sm">
                <span className="flex items-center gap-1 font-semibold text-blue-600">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-600"></span> Active Table
                </span>
                <span className="flex items-center gap-1 text-slate-500">
                  <span className="inline-block w-2 h-2 rounded-full bg-orange-400"></span> Related Table
                </span>
              </div>

              {DB_TABLES.map((table) => {
                const isActive = selectedTable === table.name;
                const isRelated = highlightedConnections.includes(table.name);
                
                let cardStyle = "bg-white border-slate-200 shadow-sm";
                if (isActive) cardStyle = "bg-white border-blue-500 ring-2 ring-blue-100 shadow-md transform scale-[1.02]";
                else if (isRelated) cardStyle = "bg-orange-50/70 border-orange-200 ring-1 ring-orange-100 shadow-sm";

                return (
                  <button
                    type="button"
                    key={table.name}
                    aria-pressed={isActive}
                    onClick={() => setSelectedTable(table.name)}
                    className={`tap-auto text-left cursor-pointer p-3 rounded-lg border flex flex-col justify-between transition-all duration-200 ${cardStyle}`}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className={`font-mono text-xs font-bold ${isActive ? 'text-blue-700' : 'text-slate-800'}`}>
                          {table.name}
                        </span>
                        <Database className={`h-3 w-3 ${isActive ? 'text-blue-600' : isRelated ? 'text-orange-500' : 'text-slate-500'}`} />
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {table.description}
                      </p>
                    </div>

                    <div className="border-t border-slate-100 mt-2 pt-2 flex flex-col gap-1">
                      {table.columns.slice(0, 3).map(col => (
                        <div key={col.name} className="flex justify-between items-center text-xs font-mono text-slate-600">
                          <span className="flex items-center gap-0.5 font-medium truncate">
                            {col.key === 'PK' && <Key className="h-2.5 w-2.5 text-yellow-500 shrink-0" />}
                            {col.key === 'FK' && <Link2 className="h-2.5 w-2.5 text-blue-500 shrink-0" />}
                            {col.name}
                          </span>
                          <span className="text-xs text-slate-500 truncate ml-1">{col.type}</span>
                        </div>
                      ))}
                      {table.columns.length > 3 && (
                        <span className="text-xs text-slate-500 text-right mt-0.5">
                          + {table.columns.length - 3} more columns
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Column Inspector */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-150 p-4 space-y-4 shadow-sm self-start">
            {selectedTable ? (
              (() => {
                const table = DB_TABLES.find(t => t.name === selectedTable)!;
                return (
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono font-semibold ">
                        Table
                      </span>
                      <h3 className="text-lg font-bold text-slate-800 font-mono mt-1">
                        {table.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        {table.description}
                      </p>
                    </div>

                    <div className="border-t border-slate-100 pt-3">
                      <h4 className="text-xs font-semibold text-slate-700 mb-2  tracking-wide">
                        Fields ({table.columns.length})
                      </h4>
                      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {table.columns.map(col => (
                          <div 
                            key={col.name} 
                            className={`p-2 rounded border border-slate-100 bg-slate-50/50 flex flex-col gap-1`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-mono text-xs text-slate-800 font-bold flex items-center gap-1">
                                {col.key === 'PK' && <span title="Primary Key"><Key className="h-3 w-3 text-yellow-500" /></span>}
                                {col.key === 'FK' && <span title="Foreign Key"><Link2 className="h-3.5 w-3.5 text-blue-500" /></span>}
                                {col.name}
                              </span>
                              <span className="font-mono text-xs bg-slate-200 text-slate-700 px-1.5 py-0.25 rounded font-medium">
                                {col.type}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-500">
                                {col.nullable ? 'NULLABLE' : 'NOT NULL'}
                              </span>
                              {col.key === 'FK' && col.refTable && (
                                <span className="text-blue-600 font-mono">
                                  References <span className="underline font-bold">{col.refTable}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded border border-slate-150 text-xs leading-relaxed text-slate-600">
                      <strong className="text-slate-700">Connected tables:</strong>
                      {highlightedConnections.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {highlightedConnections.map(c => (
                            <button
                              type="button"
                              key={c}
                              onClick={() => setSelectedTable(c)}
                              className="tap-auto cursor-pointer font-mono text-xs bg-white border border-slate-300 hover:border-orange-400 hover:text-orange-800 text-slate-700 px-2 py-1 rounded transition-colors"
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-slate-500 mt-0.5">This table is not connected to any other table.</div>
                      )}
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs">
                Select a table to see its fields and how it connects to other tables.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
