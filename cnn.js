const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const azureStorage = require('azure-storage');
const uuid = require('uuid/v1');

const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// URL de conexión a la base de datos
const uri = 'mongodb://mongodb-server:KKhYrPPGM7jKSdqZtlVsdVQkeWUTlyTjiKtR1EQ4KLg11OmMR9USDvZ1Vu2ZyMXw1xXoqsfIBvnsACDbCJPo1Q==@mongodb-server.mongo.cosmos.azure.com:10255/?ssl=true&retrywrites=false&maxIdleTimeMS=120000&appName=@mongodb-server@'; // Reemplazar con la URL de conexión de tu base de datos MongoDB

// Conectarse a la base de datos
MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(client => {
    console.log('Conexión exitosa a la base de datos');

    // Obtener una referencia a la base de datos
    const db = client.db('test');

    // Ruta principal
    app.get('/', (req, res) => {
      res.send('Hola mundo');
    });

    // Obtener todos los clientes
    app.get('/clientes', (req, res) => {
    const collection = db.collection('clientes');

    collection.find({}).toArray()
        .then(clients => {
        res.json(clients);
        })
        .catch(error => {
        console.error('Error al obtener los clientes:', error);
        res.status(500).json({ "message": "Error al obtener el cliente" });
        });
    });

   // Obtener un cliente por su ID
    app.get('/clientes/:id', (req, res) => {
        const { id } = req.params;
        const collection = db.collection('clientes');
    
        collection.findOne({ _id: new ObjectId(id) })
        .then(client => {
            if (client) {
            res.json(client);
            } else {
            res.status(404).json({ "message": "Cliente no encontrado" });
            }
        })
        .catch(error => {
            console.error('Error al obtener el cliente:', error);
            res.status(500).json({ "message": "Error al obtener cliente" });
        });
    });

    // Agregar un cliente
    app.post('/clientes', (req, res) => {
        const clientt = req.body;
        const collection = db.collection('clientes');
    
        collection.insertOne(clientt)
            .then(() => {
            res.status(201).json({ "message": "Cliente agregado correctamente" });
            })
            .catch(error => {
            console.error('Error al agregar el cliente:', error);
            res.status(500).json({ "message": "Error al agregar el cliente" });
            });
    });

     // Actualizar un cliente por su ID
     app.put('/clientes/:id', (req, res) => {
        const { id } = req.params;
        const updatedClientt = req.body;
        const collection = db.collection('clientes');
  
        collection.updateOne({ _id: id }, { $set: updatedClientt })
          .then(result => {
            if (result.matchedCount > 0) {
              res.status(200).json({ "message": "Cliente actualizado correctamente" });
            } else {
              res.status(404).json({ "message": "Cliente no encontrado" });
            }
          })
          .catch(error => {
            console.error('Error al actualizar el cliente:', error);
            res.status(500).json({ "message": "Error al actualizar el cliente" });
          });
      });

    // Eliminar un cliente por su ID
    app.delete('/clientes/:id', (req, res) => {
        const { id } = req.params;
        const collection = db.collection('clientes');
  
        collection.deleteOne({ _id: id })
          .then(result => {
            if (result.deletedCount > 0) {
              res.status(200).json({ "message": "Cliente eliminado correctamente" });
            } else {
              res.status(404).json({ "message": "Cliente no encontrado" });
            }
          })
          .catch(error => {
            console.error('Error al eliminar el cliente:', error);
            res.status(500).json({ "message": "Cliente agregado correctamente" });
          });
    });

    //----------------------------------------
    // Obtener todos los productos
    app.get('/productos', (req, res) => {
        const collection = db.collection('productos');
    
        collection.find({}).toArray()
            .then(products => {
            res.json(products);
            })
            .catch(error => {
            console.error('Error al obtener los productos:', error);
            res.status(500).json({ "message": "Error al obtener los productos" });
            });
        });

    // Obtener un producto por su ID
    app.get('/productos/:id', (req, res) => {
      const { id } = req.params;
      const collection = db.collection('productos');

      collection.findOne({ _id: new ObjectId(id) })
        .then(product => {
          if (product) {
            res.json(product);
          } else {
            res.status(404).json({ "message": "Producto obtenido correctamente" });
          }
        })
        .catch(error => {
          console.error('Error al obtener el producto:', error);
          res.status(500).json({ "message": "Error al obtener el producto" });
        });
    });

    
  // Configurar el almacenamiento de Multer
  const storage = multer.memoryStorage();
  const upload = multer({ storage });
      
    
  // Configurar la conexión a Azure Blob Storage
  const connectionString = 'DefaultEndpointsProtocol=https;AccountName=storageimgserver;AccountKey=AFsRMBlZsXV2dQ/c34nPkY6qVfw/C/2MO0YfzAt9lqFb7wxfBmA5VVObbC97EnGM9DK0PwX+rT7x+AStAAQQ+g==;EndpointSuffix=core.windows.net';
  const containerName = 'imagenesmongodb';
  const blobService = azureStorage.createBlobService(connectionString);

 // Agregar un producto
 app.post('/productos', upload.single('image_producto'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ "message": "No hay imagen" });
  }

  const product = req.body;
  const imageFile = req.file.buffer;
  const imageName = `${uuid()}.jpg`; // Genera un nombre único para la imagen

  blobService.createBlockBlobFromText(containerName, imageName, imageFile, (error, result, response) => {
    if (error) {
      console.error('Error al cargar la imagen:', error);
      return res.status(500).json({ "message": "Erro al cargar imagen" });
    }

    // Obtén el enlace de la imagen
    const imageUrl = blobService.getUrl(containerName, imageName);

    product.image_producto = imageUrl; // Guarda el enlace de la imagen en el campo "image_producto"

    const collection = db.collection('productos');

    collection.insertOne(product)
      .then(() => {
        res.status(201).json({ "message": "Producto agregado correctamente" });
      })
      .catch(error => {
        console.error('Error al agregar el producto:', error);
        res.status(500).send('Error al agregar el producto');
      });
  });
});

    
    // Actualizar un producto por su ID
    app.put('/productos/:id', (req, res) => {
      const { id } = req.params;
      const updatedProduct = req.body;
      const collection = db.collection('productos');

      collection.updateOne({ _id: id }, { $set: updatedProduct })
        .then(result => {
          if (result.matchedCount > 0) {
            res.status(200).json({ "message": "Producto actualizado correctamente" });
          } else {
            res.status(404).json({ "message": "Producto no encontrado" });
          }
        })
        .catch(error => {
          console.error('Error al actualizar el producto:', error);
          res.status(500).json({ "message": "Error al actualizar el producto" });
        });
    });

    // Eliminar un producto por su ID
    app.delete('/productos/:id', (req, res) => {
      const { id } = req.params;
      const collection = db.collection('productos');

      collection.deleteOne({ _id: id })
        .then(result => {
          if (result.deletedCount > 0) {
            res.status(200).json({ "message": "Producto eliminado correctamente" });
          } else {
            res.status(404).json({ "message": "Producto no encontrado" });
          }
        })
        .catch(error => {
          console.error('Error al eliminar el producto:', error);
          res.status(500).json({ "message": "Error al eliminar el producto" });
        });
    });

    // Obtener todos los estados de pedidos
   app.get('/estadopedidos', (req, res) => {
    const collection = db.collection('estadopedidos');
  
    collection.find({}).toArray()
      .then(estados => {
        res.json(estados);
      })
      .catch(error => {
        console.error('Error al obtener los estados de pedidos:', error);
        res.status(500).json({ "message": "Error al obtener estado-pedidos" });
      });
  });
  
  // Obtener un estado de pedido por su ID
  app.get('/estadopedidos/:id', (req, res) => {
    const { id } = req.params;
    const collection = db.collection('estadopedidos');
  
    collection.findOne({ _id: new ObjectId(id) })
      .then(estado => {
        if (estado) {
          res.json(estado);
        } else {
          res.status(404).json({ "message": "Estado pedido no encontrado" });
        }
      })
      .catch(error => {
        console.error('Error al obtener el estado de pedido:', error);
        res.status(500).json({ "message": "Error al obtener estado pedido" });
      });
  });
  
  // Agregar un estado de pedido
  app.post('/estadopedidos', (req, res) => {
    const estado = req.body;
    const collection = db.collection('estadopedidos');
  
    collection.insertOne(estado)
      .then(() => {
        res.status(201).json({ "message": "Estado pedido agregado" });
      })
      .catch(error => {
        console.error('Error al agregar el estado de pedido:', error);
        res.status(500).json({ "message": "Error al agregar estado pedido" });
      });
  });
  
  // Actualizar un estado de pedido por su ID
  app.put('/estadopedidos/:id', (req, res) => {
    const { id } = req.params;
    const updatedEstado = req.body;
    const collection = db.collection('estadopedidos');
  
    collection.updateOne({ _id: new ObjectId(id) }, { $set: updatedEstado })
      .then(result => {
        if (result.matchedCount > 0) {
          res.status(200).json({ "message": "Estado pedido actualizado" });
        } else {
          res.status(404).json({ "message": "Estado pedido no encontrado" });
        }
      })
      .catch(error => {
        console.error('Error al actualizar el estado de pedido:', error);
        res.status(500).json({ "message": "Error al actualizar pedido" });
      });
  });
  
  // Eliminar un estado de pedido por su ID
  app.delete('/estadopedidos/:id', (req, res) => {
    const { id } = req.params;
    const collection = db.collection('estadopedidos');
  
    collection.deleteOne({ _id: new ObjectId(id) })
      .then(result => {
        if (result.deletedCount > 0) {
          res.status(200).json({ "message": "Estado pedido eliminado" });
        } else {
          res.status(404).json({ "message": "Estado pedido no encontrado" });
        }
      })
      .catch(error => {
        console.error('Error al eliminar el estado de pedido:', error);
        res.status(500).json({ "message": "Error al eliminar el pedido" });
      });
  });
  
// Obtener todos los parámetros
app.get('/parametros', (req, res) => {
  const collection = db.collection('parametros');

  collection.find({}).toArray()
    .then(parametros => {
      res.json(parametros);
    })
    .catch(error => {
      console.error('Error al obtener los parámetros:', error);
      res.status(500).json({ message: 'Error al obtener los parámetros' });
    });
});

// Obtener un parámetro por su ID
app.get('/parametros/:id', (req, res) => {
  const { id } = req.params;
  const collection = db.collection('parametros');

  collection.findOne({ _id: new ObjectId(id) })
    .then(parametro => {
      if (parametro) {
        res.json(parametro);
      } else {
        res.status(404).json({ message: 'Parámetro no encontrado' });
      }
    })
    .catch(error => {
      console.error('Error al obtener el parámetro:', error);
      res.status(500).json({ message: 'Error al obtener el parámetro' });
    });
});
  
// Agregar un parámetro
app.post('/parametros', (req, res) => {
  const parametro = req.body;
  const collection = db.collection('parametros');

  collection.insertOne(parametro)
    .then(() => {
      res.status(201).json({ message: 'Parámetro agregado' });
    })
    .catch(error => {
      console.error('Error al agregar el parámetro:', error);
      res.status(500).json({ message: 'Error al agregar el parámetro' });
    });
});
  
// Actualizar un parámetro por su ID
app.put('/parametros/:id', (req, res) => {
  const { id } = req.params;
  const updatedParametro = req.body;
  const collection = db.collection('parametros');

  collection.updateOne({ _id: new ObjectId(id) }, { $set: updatedParametro })
    .then(result => {
      if (result.matchedCount > 0) {
        res.status(200).json({ message: 'Parámetro actualizado' });
      } else {
        res.status(404).json({ message: 'Parámetro no encontrado' });
      }
    })
    .catch(error => {
      console.error('Error al actualizar el parámetro:', error);
      res.status(500).json({ message: 'Error al actualizar el parámetro' });
    });
});
  
// Eliminar un parámetro por su ID
app.delete('/parametros/:id', (req, res) => {
  const { id } = req.params;
  const collection = db.collection('parametros');

  collection.deleteOne({ _id: new ObjectId(id) })
    .then(result => {
      if (result.deletedCount > 0) {
        res.status(200).json({ message: 'Parámetro eliminado' });
      } else {
        res.status(404).json({ message: 'Parámetro no encontrado' });
      }
    })
    .catch(error => {
      console.error('Error al eliminar el parámetro:', error);
      res.status(500).json({ message: 'Error al eliminar el parámetro' });
    });
});
  
  // ---------------------------------------------
// Obtener todas las facturas
app.get('/facturacabs', (req, res) => {
  const collection = db.collection('facturacabs');

  collection.find({}).toArray()
    .then(facturacabs => {
      res.json(facturacabs);
    })
    .catch(error => {
      console.error('Error al obtener las facturas:', error);
      res.status(500).json({ message: 'Error al obtener las facturas' });
    });
});
  
// Obtener una factura por su ID
app.get('/facturacabs/:id', (req, res) => {
  const { id } = req.params;
  const collection = db.collection('facturacabs');

  collection.findOne({ _id: new ObjectId(id) })
    .then(facturacab => {
      if (facturacab) {
        res.json(facturacab);
      } else {
        res.status(404).json({ message: 'Factura no encontrada' });
      }
    })
    .catch(error => {
      console.error('Error al obtener la factura:', error);
      res.status(500).json({ message: 'Error al obtener la factura' });
    });
});
  
  // Agregar una factura
  app.post('/facturacabs', (req, res) => {
    const facturacab = req.body;
    const collection = db.collection('facturacabs');
  
    collection.insertOne(facturacab)
      .then(() => {
        res.status(201).send('Factura agregada');
      })
      .catch(error => {
        console.error('Error al agregar la factura:', error);
        res.status(500).send('Error al agregar la factura');
      });
  });
  
// Agregar una factura
app.post('/facturacabs', (req, res) => {
  const facturacab = req.body;
  const collection = db.collection('facturacabs');

  collection.insertOne(facturacab)
    .then(() => {
      res.status(201).json({ message: 'Factura agregada' });
    })
    .catch(error => {
      console.error('Error al agregar la factura:', error);
      res.status(500).json({ message: 'Error al agregar la factura' });
    });
});
  
 // Eliminar una factura por su ID
app.delete('/facturacabs/:id', (req, res) => {
  const { id } = req.params;
  const collection = db.collection('facturacabs');

  collection.deleteOne({ _id: new ObjectId(id) })
    .then(result => {
      if (result.deletedCount > 0) {
        res.status(200).json({ message: 'Factura eliminada' });
      } else {
        res.status(404).json({ message: 'Factura no encontrada' });
      }
    })
    .catch(error => {
      console.error('Error al eliminar la factura:', error);
      res.status(500).json({ message: 'Error al eliminar la factura' });
    });
});
  
// Obtener todos los pedidos
app.get('/pedidos', (req, res) => {
  const collection = db.collection('pedidocabs');

  collection.find({}).toArray()
    .then(pedidos => {
      res.json(pedidos);
    })
    .catch(error => {
      console.error('Error al obtener los pedidos:', error);
      res.status(500).json({ message: 'Error al obtener los pedidos' });
    });
});
  
 // Obtener un pedido por su ID
app.get('/pedidos/:id', (req, res) => {
  const { id } = req.params;
  const collection = db.collection('pedidocabs');

  collection.findOne({ _id: new ObjectId(id) })
    .then(pedido => {
      if (pedido) {
        res.json(pedido);
      } else {
        res.status(404).json({ message: 'Pedido no encontrado' });
      }
    })
    .catch(error => {
      console.error('Error al obtener el pedido:', error);
      res.status(500).json({ message: 'Error al obtener el pedido' });
    });
});

 // Agregar un pedido
app.post('/pedidos', (req, res) => {
  const pedido = req.body;
  const collection = db.collection('pedidocabs');

  collection.insertOne(pedido)
    .then(() => {
      res.status(201).json({ message: 'Pedido agregado' });
    })
    .catch(error => {
      console.error('Error al agregar el pedido:', error);
      res.status(500).json({ message: 'Error al agregar el pedido' });
    });
});
  
  
// Eliminar un pedido por su ID
app.delete('/pedidos/:id', (req, res) => {
  const { id } = req.params;
  const collection = db.collection('pedidocabs');

  collection.deleteOne({ _id: new ObjectId(id) })
    .then(result => {
      if (result.deletedCount > 0) {
        res.status(200).json({ message: 'Pedido eliminado' });
      } else {
        res.status(404).json({ message: 'Pedido no encontrado' });
      }
    })
    .catch(error => {
      console.error('Error al eliminar el pedido:', error);
      res.status(500).json({ message: 'Error al eliminar el pedido' });
    });
});
  
    // Iniciar el servidor
    app.listen(port, () => {
      console.log(`Escuchando en el puerto: http://localhost:${port}`);
    });
  })
  .catch(error => {
    console.error('Error al conectar a la base de datos:', error);
  });
