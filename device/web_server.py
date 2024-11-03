class WebServer:
    def __init__(self, config, display):
        self.config = config
        self.display = display
        
    def start(self):
        """Start the configuration web server"""
        import socket
        
        try:
            addr = socket.getaddrinfo('0.0.0.0', 80)[0][-1]
            s = socket.socket()
            s.setblocking(False)
            s.bind(addr)
            s.listen(1)
            print("[SERVER] Running")

            while True:
                try:
                    cl, addr = s.accept()
                except OSError:
                    continue
                
                try:
                    cl.setblocking(True)
                    request = cl.recv(1024)
                    
                    if b'/configure' in request:
                        self._handle_config(cl)
                    else:
                        self._serve_config_page(cl)
                        
                except Exception as e:
                    print(f"[SERVER] Error: {e}")
                finally:
                    cl.close()
                    
        except Exception as e:
            print(f"[SERVER] Fatal error: {e}")
    
    def _handle_config(self, cl):
        """Handle configuration submission"""
        try:
            body = cl.recv(1024).decode()
            params = {}
            for param in body.split('&'):
                if '=' in param:
                    key, value = param.split('=')
                    params[key] = value
            
            if all(k in params for k in ['ssid', 'password', 'username']):
                self.config.save(params['ssid'], params['password'], params['username'])
                cl.send('HTTP/1.0 200 OK\r\nContent-Type: text/html\r\n\r\n'
                       '<html><body><h2>Saved! Rebooting...</h2></body></html>')
                import machine
                machine.reset()
        except Exception as e:
            print(f"[SERVER] Config error: {e}")
    
    def _serve_config_page(self, cl):
        """Serve the configuration page"""
        html = '''HTTP/1.0 200 OK\r\nContent-Type: text/html\r\n\r\n
<!DOCTYPE html><html><head><title>Setup</title>
<style>body{font-family:Arial;margin:20px}input{margin:10px 0;padding:5px;width:200px}
input[type="submit"]{background:#4CAF50;color:white;border:none}</style></head>
<body><h2>Device Configuration</h2><form action="/configure" method="POST">
<label>WiFi Name (SSID):</label><br><input type="text" name="ssid" required><br>
<label>Password:</label><br><input type="password" name="password" required><br>
<label>Instagram Username:</label><br><input type="text" name="username" required><br>
<input type="submit" value="Save and Connect"></form></body></html>'''
        cl.send(html)