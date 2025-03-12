import { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { useStore } from './store';

function App() {
  const {
    files,
    activeFileId,
    addFile,
    setActiveFile,
    updateFileContent,
    deleteFile,
    init,
    peerId,
    peers,
    connectToPeer,
    isOnline,
    suggestions,
    fetchSuggestions,
    // activeUsers,
  } = useStore();
  const activeFile = files.find((file) => file.id === activeFileId);
  const inputRef = useRef(null);

  useEffect(() => {
    init();
  }, [init]);

  if (!activeFile) return <div style={styles.loading}>Loading...</div>;

  const handleEditorDidMount = (editor, monaco) => {
    monaco.languages.registerCompletionItemProvider('javascript', {
      triggerCharacters: [' '],
      provideCompletionItems: (model, position) => {
        return {
          suggestions: suggestions.map((suggestion) => ({
            label: suggestion,
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: suggestion,
            range: {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: position.column,
              endColumn: position.column,
            },
          })),
        };
      },
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {
      fetchSuggestions(activeFileId, editor.getValue());
    });
  };

  const handleConnect = () => {
    const peerIdToConnect = inputRef.current.value.trim();
    if (peerIdToConnect) {
      connectToPeer(peerIdToConnect);
      inputRef.current.value = '';
    }
  };

  return (
    <div style={styles.appContainer}>
      <header style={styles.header}>
        <h2 style={styles.title}>Collaborative Code Editor</h2>
        <div style={styles.statusBar}>
          <span style={styles.statusItem}>Peer ID: {peerId || 'Connecting...'}</span>
          <span style={styles.statusItem}>Status: {isOnline ? 'Online' : 'Offline'}</span>
          <div style={styles.connectContainer}>
            <input
              type="text"
              placeholder="Enter peer ID to connect"
              ref={inputRef}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  connectToPeer(e.target.value);
                  e.target.value = '';
                }
              }}
              style={styles.input}
            />
            <button onClick={handleConnect} style={styles.connectButton}>
              Connect
            </button>
          </div>
          <span style={styles.statusItem}>
          Active Users: {peers.length + 1}
  </span>
          <span style={styles.statusItem}>
            Peers: {peers.length ? peers.join(', ') : 'None'}
          </span>
        </div>
        <div style={styles.tabsContainer}>
          {files.map((file) => (
            <div key={file.id} style={styles.tabWrapper}>
              <button
                onClick={() => setActiveFile(file.id)}
                style={{
                  ...styles.tab,
                  background: file.id === activeFileId ? '#2d3748' : '#4a5568',
                  color: file.id === activeFileId ? '#ffffff' : '#cbd5e0',
                }}
              >
                {file.name}
                {files.length > 1 && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFile(file.id);
                    }}
                    style={styles.closeIcon}
                  >
                    ✕
                  </span>
                )}
              </button>
            </div>
          ))}
          <button onClick={addFile} style={styles.addButton}>
            + New File
          </button>
        </div>
      </header>
      <main style={styles.editorContainer}>
        <Editor
          height="100%"
          defaultLanguage="javascript"
          value={activeFile?.content || ''}
          onChange={(value) => updateFileContent(activeFileId, value || '')}
          theme="vs-dark"
          onMount={handleEditorDidMount}
          options={{ minimap: { enabled: false }, fontSize: 14 }}
        />
      </main>
    </div>
  );
}

const styles = {
  appContainer: {
    height: '100vh',
    width: '100vw',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#1a202c',
    overflow: 'hidden',
  },
  header: {
    padding: '15px',
    backgroundColor: '#2d3748',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
    zIndex: 10,
    '@media (maxWidth: 768px)': {
      padding: '10px', 
    },
  },
  title: {
    margin: 0,
    fontSize: '1.5rem',
    color: '#ffffff',
    fontFamily: 'Arial, sans-serif',
    '@media (maxWidth: 768px)': {
      fontSize: '1.2rem', 
    },
    '@media (maxWidth: 480px)': {
      fontSize: '1rem', 
    },
  },
  statusBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '10px',
    color: '#a0aec0',
    fontSize: '0.9rem',
    flexWrap: 'wrap', 
    gap: '10px', 
    '@media (maxWidth: 768px)': {
      flexDirection: 'column', 
      alignItems: 'flex-start',
      fontSize: '0.8rem',
    },
  },
  statusItem: {
    margin: '0 10px',
    '@media (maxWidth: 768px)': {
      margin: '5px 0', // Vertical spacing on smaller screens
    },
  },
  connectContainer: {
    display: 'flex',
    alignItems: 'center',
    '@media (maxWidth: 768px)': {
      width: '100%', // Full width on smaller screens
      margin: '5px 0',
    },
  },
  input: {
    padding: '5px 10px',
    borderRadius: '4px',
    border: '1px solid #4a5568',
    backgroundColor: '#edf2f7',
    color: '#2d3748',
    fontSize: '0.9rem',
    marginRight: '10px',
    outline: 'none',
    width: '200px', // Fixed width on desktop
    '@media (maxWidth: 768px)': {
      width: '70%', 
      fontSize: '0.8rem',
    },
    '@media (maxWidth: 480px)': {
      width: '60%',
    },
  },
  connectButton: {
    padding: '5px 15px',
    backgroundColor: '#48bb78',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'background-color 0.2s',
    ':hover': { backgroundColor: '#38a169' },
    '@media (maxWidth: 768px)': {
      padding: '5px 10px',
      fontSize: '0.8rem',
    },
  },
  tabsContainer: {
    display: 'flex',
    alignItems: 'center',
    marginTop: '10px',
    flexWrap: 'wrap',
    gap: '5px', // Space between tabs
    '@media (maxWidth: 768px)': {
      marginTop: '5px',
    },
  },
  tabWrapper: {
    position: 'relative',
    marginBottom: '5px',
  },
  tab: {
    padding: '8px 25px 8px 12px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'background-color 0.2s',
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
    minWidth: '100px', // tabs don’t collapse too much
    ':hover': { backgroundColor: '#4a5568' },
    '@media (maxWidth: 768px)': {
      padding: '6px 20px 6px 10px',
      fontSize: '0.8rem',
      minWidth: '80px',
    },
    '@media (maxWidth: 480px)': {
      padding: '5px 15px 5px 8px',
      fontSize: '0.7rem',
      minWidth: '60px',
    },
  },
  closeIcon: {
    position: 'absolute',
    right: '5px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#ff4444',
    fontSize: '12px',
    cursor: 'pointer',
    padding: '0 4px',
    '@media (maxWidth: 480px)': {
      fontSize: '10px', // Smaller cross on mobile
    },
  },
  addButton: {
    padding: '8px 15px',
    backgroundColor: '#3182ce',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'background-color 0.2s',
    marginBottom: '5px',
    ':hover': { backgroundColor: '#2b6cb0' },
    '@media (maxWidth: 768px)': {
      padding: '6px 10px',
      fontSize: '0.8rem',
    },
    '@media (maxWidth: 480px)': {
      padding: '5px 8px',
      fontSize: '0.7rem',
    },
  },
  editorContainer: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  },
  loading: {
    height: '100vh',
    width: '100vw',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a202c',
    color: '#ffffff',
    fontSize: '1.5rem',
    '@media (maxWidth: 768px)': {
      fontSize: '1.2rem',
    },
  },
};

export default App;